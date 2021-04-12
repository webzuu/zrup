#!/usr/bin/env node

import findUp from "find-up";
import fs from "fs/promises";

import { program, Command } from "commander";
import * as path from "path";

import {fileURLToPath} from 'url';
import {dirname} from 'path';
import {Zrup} from "./zrup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main()
{
    const cli = await parseCommandLine();
    if (cli.init) {
        await Zrup.init(path.resolve(process.cwd(), cli.args[0] || '.') );
        return;
    }
    const there = await Zrup.locateRoot(process.cwd());
    const request = {
        goals:          cli.args,
        options:        cli.opts()
    }
    const zrup = new Zrup(there, await Zrup.loadConfig(there), request);
    await zrup.run();
}

async function parseCommandLine(): Promise<Command>
{
    program.version(await getVersion());
    program
        .option('-i, --init', 'Initialize a zrup build system in current directory')
        .option('-v, --verbose', 'Log tons of debug info to console')
    program.parse(process.argv);
    return program as Command;
}

async function getVersion()
{
    const jsonFilePath = (await findUp('package.json',{ cwd: __dirname })) as string;
    const data = JSON.parse(await fs.readFile(jsonFilePath, 'utf-8'));
    return data.version;
}

(async () => {
    await main();
})().then(() => { process.exit(0); });
