#!/usr/bin/env node

import findUp from "find-up";
import fs from "fs/promises";

import { program, Command } from "commander";
import * as path from "path";

import {fileURLToPath} from 'url';
import {dirname} from 'path';
import * as util from "util";
import {Zrup} from "./zrup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main(argv)
{
    const cli = await parseCommandLine();
    if (cli.init) {
        await Zrup.init(path.resolve(process.cwd(), cli.args[0] || '.') );
        return;
    }
    const there = await Zrup.locateRoot(process.cwd());
    const zrup = new Zrup(there, await Zrup.loadConfig(there));
    await zrup.run({
        goals: cli.args
    });
}

/**
 * @return {Promise<Command>}
 */
async function parseCommandLine()
{
    program.version(await getVersion());
    program
        .option('-i, --init', 'Initialize a zrup build system in current directory')
    program.parse(process.argv);
    return program;
}

async function getVersion()
{
    const jsonFilePath = await findUp('package.json',{ cwd: __dirname });
    const data = JSON.parse(await fs.readFile(jsonFilePath, 'utf-8'));
    return data.version;
}

(async () => {
    await main(process.argv);
})().then(() => { process.exit(0); });
