import * as fs from 'fs';
import * as util from 'util';
import * as child_process from "child_process";
import {promise as glob} from "glob-promise";

const exec = util.promisify(child_process.exec);

for (const dir of ["out", "extension-out"]) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, {recursive: true});
    }
}

const build = await exec('next build && next export');
if (build.stdout) {
    console.log(build.stdout);
}
if (build.stderr) {
    console.error(build.stderr);
}
await fs.promises.mkdir("extension-out");


const files = (await glob("out/*")).filter(file => fs.lstatSync(file).isFile());

for (const file of files) {
    const fileContents = await fs.promises.readFile(`${file}`, "utf8");
    const newFileContents = fileContents.replace(/\/_next/g, "\/next/_next");
    await fs.promises.writeFile(`${file}`, newFileContents);
}

await fs.promises.cp("out", "extension-out/next", {recursive: true})

await fs.promises.cp("extension", "extension-out", {recursive: true})

for (const build of [exec("tsc ./background/background.ts --outDir extension-out "), exec("tsc ./content/content.ts --outDir extension-out")]) {
    if (build.stdout) {
        console.log(build.stdout);
    }
    if (build.stderr) {
        console.error(build.stderr);
    }
}

for (const dir of ["out"]) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, {recursive: true});
    }
}
