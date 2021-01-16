/**
 * @callback CommandRecipe~commandAcceptor
 * @param {string} command
 * @param {...(string|Artifact|AID|Dependency)}} arguments
 */

/**
 * @callback CommandRecipe~argumentsAcceptor
 * @param {...(string|Artifact|AID|Dependency)} arguments
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
 * @callback CommandRecipe~templateTransformer
 * @param {string[]} strings
 * @param {...*} variables
 * @return string
 */

/**
 * @typedef {Object.<string,*>} CommandRecipe~BuilderParams
 * @property {Job} job
 * @property {CommandRecipe~commandAcceptor} exec
 * @property {CommandRecipe~argumentsAcceptor} shell
 * @property {CommandRecipe~argumentsAcceptor} args
 * @property {CommandRecipe~cwdAcceptor} cwd
 * @property {CommandRecipe~outputListenerAcceptor} out
 * @property {CommandRecipe~outputListenerAcceptor} err
 * @property {CommandRecipe~outputListenerAcceptor} combined
 * @property {CommandRecipe~templateTransformer} T
 */

/**
 * @typedef {Object} CommandRecipe~Config
 * @property {string} exec
 * @property {boolean} shell
 * @property {string[]} args
 * @property {string|undefined} cwd
 * @property {CommandRecipe~outputListener[]} out
 * @property {CommandRecipe~outputListener[]} err
 * @property {CommandRecipe~outputListener[]} combined
 */

/**
 * @callback CommandRecipe~builder
 * @param {CommandRecipe~BuilderParams} params
 */

import {Recipe} from "../recipe.js";
import {spawn} from "child_process";
import fs from "fs";
import * as path from "path";
import {FileArtifact} from "../../graph/artifact/file.js";
import {AID, Artifact} from "../../graph/artifact.js";
import {Readable} from "stream";
import {Dependency} from "../../graph/dependency.js";
import {reassemble} from "../../util/tagged-template.js";

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

    createChildProcess(job, config)
    /**
     * @param {Job} job
     * @param {CommandRecipe~Config} config
     * @return {ChildProcessWithoutNullStreams}
     */
    {
        let {exec, shell, args, cwd, out, err, combined} = config;
        if ('undefined' === typeof cwd) {
            cwd = job.rule.module.absolutePath;
        }
        const options = {};
        if (shell) options.shell = "/bin/bash";
        if (cwd) options.cwd = path.resolve(job.rule.module.absolutePath, cwd);
        exec = exec.replace(/^\s+/,'').replace(/\s+$/,'');
        const rawExec = exec+'';
        if (shell) exec = `set -euo pipefail; ${exec}`;
        job.build.emit('spawning.command',job,rawExec,args,options);
        const child = spawn(exec, args, options);
        job.build.emit('spawned.command',job, child);

        for(let listener of out) addDataListenerToStreams(listener, child, child.stdout);
        for(let listener of err) addDataListenerToStreams(listener, child, child.stderr);
        for(let listener of combined) addDataListenerToStreams(listener, child, child.stdout, child.stderr);
        return child;
    }

    createCompletionPromise(child, job, config)
    {
        return new Promise((resolve, reject) => {
            child.on('exit', (code, signal) => {
                if (code !== 0 || signal) {
                    reject(new CommandError(job, config.exec.trimStart().trimEnd(), code, signal));
                }
                else {
                    job.build.emit('completed.command',job,child);
                    resolve();
                }
            });
        });
    }

    async resolveSpecFor(job) {
        let exec = "";
        let shell = false;
        const args = [];
        let cwd = undefined;
        const out = [];
        const err = [];
        const combined = [];

        const resolve = resolveArtifacts.bind(null,job,false);
        const resolveExceptStrings = resolveArtifacts.bind(null,job,true);

        const builderParams = {
            exec: (cmdString, ...argItems) => {
                exec = cmdString;
                args.push(...resolveExceptStrings(...argItems.flat()).map(_ => ''+_));
            },
            shell: (...argItems) => {
                exec = resolveExceptStrings(...argItems.flat()).map(_ => ''+_).join(" ");
                shell = true;
            },
            args: (...argItems) => { args.push(...resolveExceptStrings(...argItems.flat()).map(_ => ''+_)); },
            cwd: cwdValue => { cwd = cwdValue; },
            out: sink => { out.push(makeOutputSink(job, sink)); },
            err: sink => { err.push(makeOutputSink(job, sink)); },
            combined: sink => { combined.push(makeOutputSink(job, sink)); },
            resolve,
            T: reassemble.bind(null, ref => resolveArtifacts(job, false, ref)[0])
        }

        this.#commandBuilder(builderParams);

        return {job, exec, shell, args, cwd, out, err, combined, resolve};
    }

    async executeFor(job, spec) {
        const child = this.createChildProcess(job, spec);
        await this.createCompletionPromise(child, job, spec);
    }

    describeSpec(spec) {
        const result = {};
        result.exec = spec.exec;
        result.shell = spec.shell;
        result.args = spec.args;
        result.cwd = spec.cwd;
        result.out = spec.out.map(this.#makeSinkDescriber("stdout", spec));
        result.err = spec.err.map(this.#makeSinkDescriber("stderr", spec));
        result.combined = spec.combined.map(this.#makeSinkDescriber("combined", spec));
        return result;
    }

    #makeSinkDescriber = (streamName, spec) =>
    {
        return sink => {
            if (sink.descriptor) return sink.descriptor;
            spec.job.build.emit(
                "warning",
                "outputSink.descriptor.missing",
                streamName,
                spec,
                spec.job
            );
            return sink.toString();
        }
    }
}

/**
 *
 * @param {Artifact~Reference} artifactRef
 * @param {Job} job
 * @return {function(*=): void}
 */
export function captureTo(artifactRef,job)
{
    const outputFilePath = job.build.artifactManager.resolveToExternalIdentifier(artifactRef);
    let append = false;
    const result = chunk => {
        if(!append) {
            fs.mkdirSync(path.dirname(outputFilePath),{mode: 0o755, recursive: true});
            fs.writeFileSync(outputFilePath, chunk);
            job.build.emit('capturing.output',job,outputFilePath);
            append = true;
        }
        else {
            fs.appendFileSync(outputFilePath, chunk);
        }
    }
    result.descriptor = {
        action: "write to file artifact",
        artifact: artifactRef+''
    };
    return result;
}

class OutputSinkIsArray extends Error {}

function makeOutputSink(job, sink) {
    if (Array.isArray(sink)) {
        throw new OutputSinkIsArray();
    }
    if ('function'===typeof sink) {
        return sink;
    }
    if (sink instanceof FileArtifact) {
        return captureTo(job.build.artifactManager.resolveToExternalIdentifier(sink.identity),job);
    }
    if ('object' === typeof sink && 'function' === typeof sink.toString) {
        sink = sink.toString();
    }
    if (('string'===typeof sink) || (sink instanceof AID)) {
        sink = job.build.artifactManager.get(sink);
    }
    if (sink instanceof FileArtifact) {
        const resolved = job.build.artifactManager.resolveToExternalIdentifier(sink.identity);
        return captureTo(resolved,job);
    }
    throw new Error("Output sink must be an artifact reference or a callback");
}

/**
 * @param {CommandRecipe~outputListener} listener
 * @param {ChildProcessWithoutNullStreams} child
 * @param {...Readable} streams
 */
function addDataListenerToStreams(listener, child, ...streams)
{
    for(let stream of streams) {
        stream.on('data', listener);
    }
    child.on('exit', () => { listener(''); });
}

/**
 * @param {(Artifact|AID|Dependency|string)} artifactLike
 * @return {string}
 */
function obtainArtifactReferenceFrom(artifactLike)
{
    if ("string" === typeof artifactLike) return artifactLike;
    if (artifactLike instanceof Artifact) return artifactLike.identity;
    if (artifactLike instanceof Dependency) return artifactLike.artifact.identity;
    if (artifactLike instanceof AID) return artifactLike.toString();
    throw new Error("Object passed to obtainArtifactReferenceFrom cannot be converted to artifact reference");
}

/**
 * @param {Job} job
 * @param {boolean} skipStrings
 * @param {...(Artifact|AID|Dependency|string)} refs
 * @return {(string|{toString: function(): string})[]}
 */
function resolveArtifacts(job, skipStrings, ...refs) {
    return refs.map(ref => {
        if (skipStrings && 'string' === typeof ref) return ref;
        const artifact = job.build.artifactManager.get(obtainArtifactReferenceFrom(ref));
        const externalIdentifier = job.build.artifactManager.resolveToExternalIdentifier(artifact.identity);
        const result = { toString: () => externalIdentifier };
        Object.defineProperty(result, "artifact", { get: () => artifact });
        return result;
    });
}
