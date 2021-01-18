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
 * @typedef {(Artifact|AID|Dependency)} CommandRecipe~Resolvable
 */

/**
 * @typedef {(CommandRecipe~Resolvable|Function)} CommandRecipe~OutputSink
 */

/**
 * @typedef {(CommandRecipe~OutputSink|Array.<CommandRecipe~OutputSinks>)} CommandRecipe~OutputSinks
 */

/**
 * @typedef {(CommandRecipe~Resolvable|string)} CommandRecipe~CommandSegment
 */

/**
 * @typedef {(CommandRecipe~CommandSegment|Array.<CommandRecipe~CommandSegments>)} CommandRecipe~CommandSegments
 */

/**
 * @typedef {Object.<string,*>} CommandRecipe~SimpleDescriptor
 * @property {CommandRecipe~CommandSegments}                    cmd
 * @property {CommandRecipe~CommandSegments}                    [args]
 * @property {CommandRecipe~CommandSegment}                     [cwd]
 * @property {Object.<string,CommandRecipe~CommandSegments>}    [env]
 * @property {boolean|string}                                   [shell]
 * @property {CommandRecipe~OutputSinks}                        [out]
 * @property {CommandRecipe~OutputSinks}                        [err]
 * @property {CommandRecipe~OutputSinks}                        [combined]
 * @property {boolean}                                          [always]
 */

/**
 * @callback CommandRecipe~builder
 * @param {CommandRecipe~BuilderParams} params
 */

/**
 * @callback CommandRecipe~simpleDescriptorBuilder
 * @param {CommandRecipe~BuilderParams} params
 * @return {CommandRecipe~SimpleDescriptor}
 */

/**
 * @callback CommandRecipe~simpleDescriptorBuilderAcceptor
 * @param {string} ruleName
 * @param {CommandRecipe~simpleDescriptorBuilder} descriptorProvider
 */

/***/
import ducktype from "ducktype";
const DuckType = ducktype(Boolean).constructor;
import recursive, {dictionary} from "../../util/ducktype.js";
import {Recipe} from "../recipe.js";
import {spawn} from "child_process";
import fs from "fs";
import * as path from "path";
import {FileArtifact} from "../../graph/artifact/file.js";
import {AID, Artifact} from "../../graph/artifact.js";
import {Readable} from "stream";
import {Dependency} from "../../graph/dependency.js";
import {reassemble} from "../../util/tagged-template.js";
import {Module} from "../../module.js";

/***/
export const CommandError = class CommandError extends Error

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

let self
export const CommandRecipe = self = class CommandRecipe extends Recipe
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
        job.build.emit('spawned.command',job,rawExec,args,child);

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
        let always = false;

        const resolve = resolveArtifacts.bind(null,job.build.artifactManager,job.rule.module,false);
        const resolveExceptStrings = resolveArtifacts.bind(null,job.build.artifactManager,job.rule.module,true);

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
            always: () => { always = true; },
            resolve,
            T: reassemble.bind(
                null,
                ref => resolveArtifacts(
                    job.build.artifactManager,
                    job.rule.module,
                    false,
                    ref
                )[0]
            )
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

    /**
     * @param {RuleBuilder} ruleBuilder
     * @param {Module} module
     * @param {string} ruleName
     * @param {Function} descriptorProvider
     */
    static to(ruleBuilder, module, ruleName, descriptorProvider)
    {
        ruleBuilder.acceptDefiner(
            module,
            ruleName,
            CommandRecipe.#createShellCommandRuleDefiner(descriptorProvider)
        )
    }

    static #createShellCommandRuleDefiner(descriptorProvider)
    {
        // noinspection UnnecessaryLocalVariableJS
        /** @type {RuleBuilder~definer} */
        const definer = (R) => {
            return new CommandRecipe(C => {

                const descriptor = descriptorProvider(Object.assign({},R,{T: C.T}));
                CommandRecipe.#validateCommandDescriptorSchema(descriptor);
                C.shell(...(Array.isArray(descriptor.cmd) ? descriptor.cmd : [descriptor.cmd]));
                if ('args' in descriptor) {
                    C.args(...(Array.isArray(descriptor.args) ? descriptor.args : [descriptor.args]))
                }
                for(let key of ['args','cwd','out','err','combined','always']) {
                    if (!(key in descriptor)) continue;
                    for (let item of (Array.isArray(descriptor[key]) ? descriptor[key] : [descriptor[key]])) {
                        C[key](item);
                    }
                }
            });
        };
        return definer;
    }

    static #validateCommandDescriptorSchema(descriptor)
    {
        CommandRecipe.#createDescriptorValidator(ducktype(String,AID,Artifact,Dependency)).validate(descriptor);
    }

    static #createDescriptorValidator(itemType)
    {
        const items = recursive(items => ducktype(itemType, [items]));
        const sink = ducktype(itemType, Function);
        const sinks = recursive(sinks => ducktype(sink, [sinks]));
        const opt = { optional: true };
        return ducktype(
            {
                cmd: items,
                args: ducktype(items, opt),
                cwd: ducktype(itemType, opt),
                env: dictionary(items, opt),
                out: ducktype(sinks, opt),
                err: ducktype(sinks, opt),
                combined: ducktype(sinks, opt)
            }
        )
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
 * @param {ArtifactManager} artifactManager
 * @param {Module} module,
 * @param {boolean} skipStrings
 * @param {...(CommandRecipe~CommandSegment)} refs
 * @return {(string|{toString: function(): string})[]}
 */
export function resolveArtifacts(
    artifactManager,
    module,
    skipStrings,
    ...refs
)
{
    return refs.map(ref => {
        if (skipStrings && 'string' === typeof ref) return ref;

        const artifact = artifactManager.get(
            new AID(obtainArtifactReferenceFrom(ref)).withDefaults({module: module.name})
        );
        const externalIdentifier = artifactManager.resolveToExternalIdentifier(artifact.identity);
        const result = { toString: () => externalIdentifier };
        Object.defineProperty(result, "artifact", { get: () => artifact });
        return result;
    });
}
