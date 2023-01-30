# AI Sponsor Removal

## How To
1. Clone The Repository / Download the Code
2. Install Dependencies with `yarn`
3. Build the Extension with `yarn build`
4. Point Chrome to the `extension-out` folder as a chrome extension (Go to <about:extensions> and click "Load unpacked") 
5. Get an OpenAI API Key and paste it into the extension's popup page (You may need to adjust the time between tokens in `background.ts` if you are on the free trial)
6. Open a youtube video, and wait for the Yellow Text saying `Loading Sponsor Times...`
7. Watch the Video, and see a popup in the Upper Right when a sponsored segment is skipped.
