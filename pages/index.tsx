import type {NextPage} from 'next'
import tw from 'twin.macro'
import React, {useEffect} from "react";

const Home: NextPage = () => {

    const [global, setGlobal] = React.useState(true);
    const [specific, setSpecific] = React.useState(false);
    const [currentChannel, setCurrentChannel] = React.useState<string | undefined>(undefined);
    const [youtubeVideo, setYoutubeVideo] = React.useState("");
    const [selectedFile, setSelectedFile] = React.useState<File | undefined>(undefined);
    const [uploading, setUploading] = React.useState(false);

    useEffect(() => {
        (async () => {
            const channel = await chrome.runtime.sendMessage({
                "type": "currentChannel",
            });
            setCurrentChannel(channel.channel);
            setSpecific(channel.disabled ?? false)
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
                            Global Enable
                        </p>
                        <input
                            type="checkbox"
                            checked={global}
                            onChange={() => {
                                setGlobal(!global)
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
                    <p css={tw`px-2 whitespace-nowrap`}>
                        {uploading ? `Uploading... This may take a while` : `Upload Transcript`}
                    </p>
                    <input
                        type="text"
                        value={youtubeVideo}
                        onChange={(event) => {
                            setYoutubeVideo(event.target.value)
                        }}
                        css={tw`mr-2 ml-auto`}
                    />
                    <input type="file" name="file" onChange={(event) => {
                        setSelectedFile(event.target.files![0]);
                    }}
                    />
                    <button
                        css={tw`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded`}
                        onClick={async () => {
                            if (selectedFile) {
                                const reader = new FileReader()
                                reader.onload = async (e) => {
                                    const text = (e.target!.result)
                                    setUploading(true);
                                    console.log(text);
                                    await chrome.runtime.sendMessage({
                                        "type": "parseSRT",
                                        "srt": text,
                                        "id": youtubeVideo
                                    });
                                    setUploading(false);
                                };
                                console.log("reading file");
                                reader.readAsText(selectedFile!)
                            }
                        }}
                    >
                        Upload
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Home
