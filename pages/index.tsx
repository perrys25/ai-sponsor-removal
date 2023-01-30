import type {NextPage} from 'next'
import tw from 'twin.macro'
import React, {useEffect} from "react";

const Home: NextPage = () => {

    const [global, setGlobal] = React.useState(true);
    const [specific, setSpecific] = React.useState(false);
    const [currentChannel, setCurrentChannel] = React.useState<string | undefined>(undefined);
    const [openAIKey, setOpenAIKey] = React.useState<string>("");

    useEffect(() => {
        (async () => {
            const key = await chrome.storage.sync.get("openAIKey");
            setOpenAIKey(key.openAIKey ?? "");
            const channel = await chrome.runtime.sendMessage({
                "type": "currentChannel",
            });
            setCurrentChannel(channel.channel);
            setSpecific(channel.disabled ?? false)
            setGlobal((chrome.storage.sync.get("global") as any).global ?? true);
        })();
    }, [])

    return (
        <div css={tw`p-8 text-lg`}>
            <div css={tw`font-bold text-2xl mx-auto`}>
                AI Sponsor Removal
            </div>
            <div css={tw`mt-4`}>
                <div css={tw`flex justify-center bg-gray-200 flex-col`}>
                    <div css={tw`flex flex-row`}>
                        <p css={tw`px-2 whitespace-nowrap`}>
                            Open AI Key
                        </p>
                        <input
                            type="text"
                            value={openAIKey}
                            onChange={(e) => {
                                setOpenAIKey(e.target.value);
                                chrome.storage.sync.set({openAIKey: e.target.value});
                            }}
                            css={tw`mr-2 ml-auto`}
                        />
                    </div>
                    <div css={tw`flex flex-row`}>
                        <p css={tw`px-2 whitespace-nowrap`}>
                            Global Enable
                        </p>
                        <input
                            type="checkbox"
                            checked={global}
                            onChange={() => {
                                setGlobal(!global)
                                chrome.storage.sync.set({global: !global});
                            }}
                            css={tw`mr-2 ml-auto`}
                        />
                    </div>
                    {currentChannel && <div css={tw`flex flex-row`}>
                        <p css={tw`px-2 whitespace-nowrap`}>
                            {`Disable for @${currentChannel}`}
                        </p>
                        <input
                            type="checkbox"
                            checked={specific}
                            onChange={() => {
                                chrome.runtime.sendMessage({type: "setChannel", mention: currentChannel, disabled: !specific});
                                setSpecific(!specific)
                            }}
                            css={tw`mr-2 ml-auto`}
                        />
                    </div>}
                </div>
            </div>
        </div>
    )
}

export default Home
