#!/usr/bin/env node

import findUp from "find-up";
import fs from "fs/promises";

// value import of the module
import { program } from 'commander';

// type-only import of the interface
import type { Command } from 'commander';
import * as path from "path";

import {fileURLToPath} from 'url';
import {dirname} from 'path';
import {Zrup} from "./zrup.js";
import {dump} from "../util/insist.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
async function main()
{
    const cli = await parseCommandLine();
    if (cli.opts().init) {
        await Zrup.init(path.resolve(process.cwd(), cli.args[0] || '.') );
        return;
    }
    const there = await Zrup.locateRoot(process.cwd());

    const opts = cli.opts();
    Zrup.Schema.RequestOptions.assert(opts);
    const request : Zrup.Request = {
        goals:          cli.args,
        options:        opts
    }
    const config = await Zrup.loadConfig(there);
    const zrup = new Zrup(there, config, request);
    const promiseLog = config.promiseLog;
    if (promiseLog) {
        process.on('beforeExit', (code) => { dump(promiseLog.replace('<zrupDir>',config.zrupDir)); })
    }
    await zrup.run();
}

async function parseCommandLine(): Promise<Command>
{
    program.version(await getVersion());
    program
        .option('-i, --init', 'Initialize a zrup build system in current directory')
        .option('-v, --verbose', 'Log tons of debug info to console')
        .argument('[goals...]', 'Build goals')

    program.parse(process.argv);
    return program;
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
