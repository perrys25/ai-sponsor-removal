export {}

async function getCurrentTab() {
    let queryOptions = {active: true, lastFocusedWindow: true};
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

const channels: { [key: string]: string } = {}

function readLocalStorage(key: string): Promise<any> {
    return new Promise((resolve) => {
        chrome.storage.local.get(key, function (result) {
            resolve(result ? result[key] : undefined);
        });
    });
}

function parseSrt(text: string) {
    let i = 0;
    let lines = text.split("\n");
    let result = [];
    while (i <= lines.length) {
        let index = lines[++i];
        let time = lines[++i];
        const caption = []
        while (lines[++i]) {
            caption.push(lines[i])
        }
        result.push({index, time, caption: caption.join("\n")})
    }
    return result;
}

async function checkTextSegment(text: string[]): Promise<{ [key: string]: boolean }> {
    const chunks: { [id: string]: string[] } = {};
    for (let i = 0; i < text.length; i += 10) {
        chunks[i.toString()] = (text.slice(i, i + 10));
    }
    const openAIKey = (await chrome.storage.sync.get("openAIKey") as {openAIKey: string}).openAIKey;
    return (await Promise.all(Object.keys(chunks).map(async (id) => {
            const chunk = chunks[id];
            await new Promise(r => setTimeout(r, (parseInt(id) / 10) * 6000));
            console.log("Checking chunk: " + id);
            return await fetch('https://api.openai.com/v1/completions', {
                method: 'POST',
                body: JSON.stringify({
                    "model": "code-davinci-002",
                    "prompt": `
The following is a list of lines text (String) from a video transcript, and a separate array that contains true or false (Boolean) for each ID, saying if it contains sponsored content or not.
---

Text Lines:

${chunk.map((line, index) => `$Line ${index}:\n${line}`).join("\n")}

---

Sponsored Content:

[`,
                    "temperature": 0,
                    "max_tokens": 4 * chunk.length,
                    "top_p": 1,
                    "frequency_penalty": 0,
                    "presence_penalty": 0,
                    "stop": ["]", "\n"]
                }),
                headers: {
                    "Authorization": "Bearer " + openAIKey,
                    "Content-Type": "application/json"
                }
            })
                .then((response) => ((response.json() as any)).then((response: any) => {
                    if (!response.choices) {
                        console.log(JSON.stringify(response));
                        return []
                    }
                    const text = response.choices[0].text;
                    console.log(id + ": " + text)
                    return text.split(",").map((line: string) => line.trim().toLowerCase() === "true");
                }))
        }
    )).then(results => results.flatMap(s => [...s, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined].slice(0, 10))).then((results) => {
        const result: { [key: string]: boolean } = {};
        for (let i = 0; i < text.length; i++) {
            result[i.toString()] = results[i];
        }
        return result;
    }));
}

async function parseSrtAndCheck(text: string | {index: string, time: string, caption: string}[]) {
    const parsed = text instanceof Array ? text : parseSrt(text);
    const textLines = parsed.map((line) => line.caption);
    const result = await checkTextSegment(textLines);
    return parsed.map((line) => ({...line, sponsored: result[line.index]}))
}

async function getTimes(check: {sponsored: boolean, index: string, time: string, caption: string}[]) {
    const parseTime = (time: string) => {
        const [hours, minutes, seconds, milliseconds] = time.replace(",", ":").split(":").map((s) => parseInt(s));
        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }

    const getTime = (line: {sponsored: boolean, index: string, time: string, duration?: string}) => {
        if (line.duration) {
            return [parseInt(line.time), parseInt(line.time) + parseInt(line.duration)]
        } else {
            const [start, end] = line.time.split(" --> ");
            return [parseTime(start), parseTime(end)];
        }
    }

    const sponsoredTimes: {start: number, end: number}[] = [];

    check.forEach(line => {
        const index = parseInt(line.index);
        const surrounding = check.slice(Math.max(0, index - 2), Math.min(check.length, index + 3));
        if (surrounding.filter(s => s.sponsored).length >= 3) {
            const start = getTime((surrounding[1].sponsored ? surrounding[1] : surrounding[2]))[0];
            const end = getTime(surrounding[3])[1];
            sponsoredTimes.push({start, end});
        }
    })

    console.log("SponsoredTimes: " + JSON.stringify(sponsoredTimes));

    //merge all adjacent times
    const mergedTimes: {start: number, end: number}[] = [];
    sponsoredTimes.forEach((time) => {
        if (mergedTimes.length === 0) {
            mergedTimes.push(time);
        } else {
            const last = mergedTimes[mergedTimes.length - 1];
            if (time.start <= last.end) {
                last.end = time.end;
            } else {
                mergedTimes.push(time);
            }
        }
    });

    return mergedTimes;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        switch (message.type) {
            case 'update': {
                channels[message.url] = message.channel;
                break;
            }
            case 'setChannel': {
                const mention = message.mention;
                const disabled = message.disabled;
                await chrome.storage.local.set({["yt.mention." + mention]: disabled});
                // TODO: Get Working
                await chrome.runtime.sendMessage({
                    "type": "reload",
                });
                break;
            }
            case 'checkDisabled': {
                const mention = message.mention;
                const disabled = await readLocalStorage("yt.mention." + mention);
                sendResponse(disabled);
                break;
            }
            case 'currentChannel': {
                const tab = await getCurrentTab();
                if (tab) {
                    const mention = channels[tab.url!];
                    if (!mention) {
                        sendResponse({
                            channel: undefined
                        });
                    } else {
                        sendResponse({
                            channel: mention,
                            disabled: (await readLocalStorage("yt.mention." + mention)) ?? false
                        });
                    }
                } else {
                    sendResponse({
                        channel: undefined
                    });
                }
                break;
            }
            case 'parseSRT': {
                const id = message.id;
                const parsed = await parseSrtAndCheck(await fetch("https://youtubetranscript.com/?server_vid=" + id).then((response) => response.text()).then(xml => {
                    const parse = xml.matchAll(/<text start="([0-9.]*)" dur="([0-9.]*)">([^<]*)<\/text>/gi)
                    const result: {time: string, duration: string, caption: string}[] = [];
                    while (true) {
                        const next = parse.next();
                        if (next.done) {
                            break;
                        }
                        const [_, time, duration, caption] = next.value;
                        result.push({
                            time,
                            duration,
                            caption
                        });
                    }
                    console.log(result)
                    return result.map((element, index) => {
                        return {
                            index: index.toString(),
                            time: element.time,
                            duration: element.duration,
                            caption: element.caption
                        }
                    });
                }));

                console.log(parsed)

                const times = await getTimes(parsed);
                console.log(JSON.stringify(times))
                await sendResponse(times);
                break;
            }
        }
    })();
    return true;
});
