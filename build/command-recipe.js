/**
 * @callback CommandRecipe~commandAcceptor
 * @param {string} command
 */

/**
 * @callback CommandRecipe~argumentsAcceptor
 * @param {...string} arg
 */

/**
 * @callback CommandRecipe~outputListenerAcceptor
 * @param {CommandRecipe~outputListener} listener
 */

/**
 * @callback CommandRecipe~outputListener
 * @param {string} chunk
 */

/**
 * @callback CommandRecipe~cwdAcceptor
 * @param {string} cwd
 */

/**
 * @typedef {Object.<string,*>} CommandRecipe~BuilderParams
 * @property {CommandRecipe~commandAcceptor} cmd
 * @property {CommandRecipe~argumentsAcceptor} args
 * @property {CommandRecipe~cwdAcceptor} cwd
 * @property {CommandRecipe~outputListenerAcceptor} out
 * @property {CommandRecipe~outputListenerAcceptor} err
 * @property {CommandRecipe~outputListenerAcceptor} combined
 */

/**
 * @callback CommandRecipe~builder
 * @param {CommandRecipe~BuilderParams} params
 */

import {Recipe} from "./recipe";
import {spawn} from "child_process";
import fs from "fs";
import * as path from "path";

export class CommandError extends Error
{
    /**
     * @param {Job} job
     * @param {string} cmd
     * @param {number} code
     * @param {string} signal
     */
    constructor(job,cmd, code,signal) {
        super(CommandError.formatMessage(job,cmd,code,signal))
    }

    /**
     * @param {Job} job
     * @param {string} cmd
     * @param {number} code
     * @param {string} signal
     * @return {string}
     */
    static formatMessage(job, cmd, code, signal)
    {
        let msg = `${job.rule.label} recipe exited with code ${code}`;
        if (signal) msg += ` (${signal})`;
        return msg;
    }
}

export class CommandRecipe extends Recipe
{
    /** @type {CommandRecipe~builder} */
    #commandBuilder;

    /** @param {CommandRecipe~builder} commandBuilder */
    constructor(commandBuilder)
    {
        super();
        this.#commandBuilder = commandBuilder.bind(null);
    }

    /**
     * @param {Job} job
     * @return {Promise<void>}
     */
    executeFor(job)
    {
        let cmd = "";
        const args = [];
        let cwd = undefined;
        const out = [];
        const err = [];
        const combined = [];

        const builderParams = {
            cmd: (cmdString, ...argStrings) => {
                cmd = cmdString;
                args.push(...argStrings);
            },
            args: (...argStrings) => { args.push(...argStrings); },
            cwd: cwdValue => { cwd = cwdValue; },
            out: listener => { out.push(listener); },
            err: listener => { err.push(listener); },
            combined: listener => { combined.push(listener); }
        }

        this.#commandBuilder(builderParams);
        if ('undefined' === typeof cwd) {
            cwd = job.rule.module.absolutePath;
        }

        const options = {};
        if (cwd) options.cwd = path.resolve(job.rule.module.absolutePath, cwd);

        const child = spawn(cmd, args, options);
        for(let listener of out) child.stdout.on('data',listener);
        for(let listener of err) child.stderr.on('data',listener);
        for(let listener of combined) {
            child.stdout.on('data',listener);
            child.stderr.on('data',listener);
        }

        return new Promise((resolve, reject) => {
            child.on("close", (code, signal) => {
                if (code !== 0 || signal) {
                    reject(new CommandError(job, cmd, code, signal));
                }
                else {
                    resolve();
                }
            });
        });
    }
}

export function captureTo(outputFilePath)
{
    let append = false;
    return chunk => {
        if(!append) {
            fs.writeFileSync(outputFilePath, chunk);
            append = true;
        }
        else {
            fs.appendFileSync(outputFilePath, chunk);
        }
    }
}