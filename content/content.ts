export {}

function waitForSelector(selector: string): Promise<any> {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve({})
        }
        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                resolve({})
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    })
}

async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

let currentId = 0;

document.addEventListener('yt-navigate-finish', async () => {
    await removeSponsors();
});

chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
        case 'reload': {
            removeSponsors();
            break
        }
    }
    return false;
});

async function removeSponsors() {
    const id = Date.now()
    currentId = id;

    await waitForSelector(".ytd-channel-name>div>yt-formatted-string>a")

    let videoID, channel;

    try {
        videoID = /(.*?)(^|\/|v=)([a-z0-9_-]{11})(.*)?/gi.exec(window.location.href)![3];
        channel = /(.*?)(^|\/|v=)@(.*)/gi.exec((document.querySelector(".ytd-channel-name>div>yt-formatted-string>a")! as HTMLLinkElement).href)![3]
    } catch (e) {
        return;
    }

    chrome.runtime.sendMessage({
        "type": "update",
        "url": window.location.href,
        "channel": channel
    });

    const disabledPromise = chrome.runtime.sendMessage({
        "type": "checkDisabled",
        "mention": channel
    });

    const disabled = await disabledPromise;

    if (disabled) {
        return;
    }

    const loadingElement = document.createElement("div");
    loadingElement.dir = "auto";
    loadingElement.className = "style-scope yt-formatted-string bold";
    loadingElement.style.color = "yellow";
    loadingElement.innerText = "Loading Sponsor Times...\n";

    document.querySelector("yt-formatted-string#info")!.appendChild(loadingElement)

    const timeStamps: { start: number, end: number }[] | undefined = await chrome.runtime.sendMessage({
        "type": "parseSRT",
        "id": videoID
    });

    if (!timeStamps) {
        loadingElement.innerText = "Error Finding Sponsor Times";
        loadingElement.style.color = "red";
        return;
    }

    loadingElement.remove();

    const active = () => currentId === id;
    await waitForSelector("#movie_player:not(.ad-showing)")
    if (!active()) return;
    await wait(500);
    if (!active()) return;
    const video = (<HTMLVideoElement>document.querySelector("video")!);
    let timer: NodeJS.Timer;
    timer = setInterval(async () => {
        if (!active()) return clearInterval(timer);

        const currentTime = video.currentTime;
        const skip = timeStamps.find(timeStamp => currentTime >= timeStamp.start - 1 && currentTime <= timeStamp.start + 1);
        if (skip) {
            if (currentTime < skip.start) {
                await wait((skip.start - currentTime) * 1000);
                if (!active()) return clearInterval(timer);
            }
            video.currentTime = skip.end;
            const button = document.createElement('button');
            button.classList.add("ytp-watch-later-button");
            button.classList.add("ytp-button");
            button.setAttribute("data-tooltip-opaque", "false");
            button.setAttribute("title", "Sponsor Skipped");
            button.setAttribute("aria-label", "Sponsor Skipped");
            button.setAttribute("style", "max-width: revert; min-width: revert; display: inline-block; opacity: 0; transition: opacity 1s ease-in-out; -moz-transition: opacity 1s ease-in-out; -webkit-transition: opacity 1s ease-in-out; -o-transition: opacity 1s ease-in-out;");
            const textDiv = document.createElement('div');
            textDiv.setAttribute("style", "color: black; font-size: large; background: white; padding: 6px 20px; border-radius: 18px; width: auto");
            textDiv.innerText = "Sponsored Segment Skipped";
            button.appendChild(textDiv);

            console.log(button)
            const buttons = document.querySelector(".ytp-chrome-top-buttons");
            if (buttons) {
                buttons.appendChild(button);
            }
            await wait(200);
            button.style.opacity = "1";
            await wait(4000);
            button.style.opacity = "0";
            await wait(1000);
            button.remove();
        }
    }, 1000);
}
