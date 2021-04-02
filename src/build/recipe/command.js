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
 * @property {templateStringTag} T
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
 * @property {Artifact~Resolvables}                    cmd
 * @property {Artifact~Resolvables}                    [args]
 * @property {Artifact~Resolvable}                     [cwd]
 * @property {Object.<string,Artifact~Resolvables>}    [env]
 * @property {boolean|string}                                   [shell]
 * @property {CommandRecipe~OutputSinks}                        [out]
 * @property {CommandRecipe~OutputSinks}                        [err]
 * @property {CommandRecipe~OutputSinks}                        [combined]
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
 * @param {(CommandRecipe~simpleDescriptorBuilder|string)} descriptorProvider
 */

/**
 * @callback CommandRecipe~flagSetter
 */

/***/
import {spawn} from "child_process";
import ducktype from "ducktype";
import fs from "fs";
import * as path from "path";
import {Readable} from "stream";
import {AID, Artifact} from "../../graph/artifact.js";
import {FileArtifact} from "../../graph/artifact/file.js";
import {Dependency} from "../../graph/dependency.js";
import {Module, resolveArtifacts} from "../../module.js";
import recursive, {dictionary} from "../../util/ducktype.js";
import {reassemble} from "../../util/tagged-template.js";
import {Recipe} from "../recipe.js";

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
        msg+="\ncommand: "+cmd;
        return msg;
    }
}

let self;
export const CommandRecipe = self = class CommandRecipe extends Recipe
{
    /** @type {CommandRecipe~builder} */
    #commandBuilder;

    /** @type {string[]} */
    #stdout = [];

    /** @type {string[]} */
    #stderr = [];

    /** @type {string[]} */
    #combined = [];

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
        if (undefined === cwd) {
            cwd = job.rule.module.name + '+';
        }
        const options = {};
        //resolve cwd
        options.cwd = resolveArtifacts(
            job.build.artifactManager,
            job.rule.module,
            false,
            ...[cwd].flat()
        )[0].toString();

        if (shell) options.shell = "/bin/bash";
        exec = exec.replace(/^\s+/,'').replace(/\s+$/,'');
        const rawExec = exec+'';
        if (shell) exec = `set -euo pipefail; ${exec}`;
        job.build.emit('spawning.command',job,rawExec,args,options);
        const child = spawn(exec, args, options);
        job.build.emit('spawned.command',job,rawExec,args,child);

        this.hookStreams(child, out, err, combined);

        return child;
    }

    hookStreams(child, out, err, combined) {
        const listen = dest => _ => dest.push(_);

        this.#stdout = [];
        this.#stderr = [];
        this.#combined = [];

        let stdoutRedirected = out.length > 0,
            stderrRedirected = err.length > 0,
            combinedRedirected = stdoutRedirected || stderrRedirected || combined.length > 0;

        if (!stdoutRedirected) out = [true];
        if (!stderrRedirected) err = [true];
        if (!combinedRedirected) combined = [true];
        for (let listener of out) {
            if (false===listener) continue;
            addDataListenerToStreams(
                true===listener ? listen(this.#stdout) : listener,
                child,
                child.stdout
            );
        }
        for (let listener of err) {
            if (false===listener) continue;
            addDataListenerToStreams(
                true===listener ? listen(this.#stderr) : listener,
                child,
                child.stderr
            );
        }
        for (let listener of combined) {
            if (false===listener) continue;
            addDataListenerToStreams(
                true===listener ? listen(this.#combined) : listener,
                child,
                child.stdout, child.stderr
            );
        }
    }

    /** @return {string} */
    get stdout() {
        return this.#stdout.join('');
    }

    /** @return {string} */
    get stderr() {
        return this.#stderr.join('');
    }

    /** @return {string} */
    get combined() {
        return this.#combined.join('');
    }

    get consoleOutput() {
        return this.#combined.length ? this.combined : this.stdout + this.stderr;
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

    /**
     * @param job
     * @return {Promise<*>}
     */
    async concretizeSpecFor(job) {

        const spec = {
            job,
            exec: "",
            shell: false,
            args: [],
            cwd: undefined,
            out: [],
            err: [],
            combined: []
        };

        const resolve = resolveArtifacts.bind(null,job.build.artifactManager,job.rule.module,false);
        const resolveExceptStrings = resolveArtifacts.bind(null,job.build.artifactManager,job.rule.module,true);

        const builderParams = {
            exec: (cmdString, ...argItems) => {
                spec.exec = cmdString;
                spec.args.push(...resolveExceptStrings(...argItems.flat()).map(_ => ''+_));
            },
            shell: (...argItems) => {
                spec.exec = resolveExceptStrings(...argItems.flat()).map(_ => ''+_).join(" ");
                spec.shell = true;
            },
            args: (...argItems) => { spec.args.push(...resolveExceptStrings(...argItems.flat()).map(_ => ''+_)); },
            cwd: cwdValue => { spec.cwd = cwdValue; },
            out: sink => { spec.out.push(makeOutputSink(job, sink)); },
            err: sink => { spec.err.push(makeOutputSink(job, sink)); },
            combined: sink => { spec.combined.push(makeOutputSink(job, sink)); },
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

        return spec;
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
            CommandRecipe.#createShellCommandRuleDefiner(ruleBuilder, module, descriptorProvider)
        )
    }

    /**
     * @param {RuleBuilder} ruleBuilder
     * @param {Module} module
     * @param {CommandRecipe~simpleDescriptorBuilder} descriptorProvider
     */
    static #createShellCommandRuleDefiner(ruleBuilder, module, descriptorProvider)
    {
        // noinspection UnnecessaryLocalVariableJS
        /** @type {RuleBuilder~definer} */
        const definer = (R) => {
            return self.fromSimpleDescriptor(module, self.#redeemDescriptorProvider(R,descriptorProvider));
        };
        return definer;
    }

    /**
     * @param {RuleBuilder~DefinerParams} R
     * @param {CommandRecipe~simpleDescriptorBuilder|string} provider
     * @return {CommandRecipe~SimpleDescriptor}
     */
    static #redeemDescriptorProvider(R,provider)
    {
        if ('string' === typeof provider) {
            return {
                cmd: provider
            };
        }
        else if ('function' === typeof provider) {
            return provider(R);
        }
        throw new Error("Invalid provider of command recipe descriptor");
    }

    /**
     * @param {(CommandRecipe~SimpleDescriptor|string)} descriptor
     * @param {Module} module
     */
    static fromSimpleDescriptor(module, descriptor)
    {
        descriptor = 'string' === typeof descriptor ? { cmd: descriptor } : descriptor;
        return new CommandRecipe(C => {

            CommandRecipe.#validateCommandDescriptorSchema(descriptor);
            C.shell(...[descriptor.cmd].flat());
            if ('args' in descriptor) {
                C.args(...[descriptor.args].flat())
            }
            if ('cwd' in descriptor) {
                const cwd = [descriptor.cwd].flat();
                if (cwd.length !== 1) {
                    //TODO: throw InvalidSpecification
                    throw new Error("Invalid specification: cwd must be a single item")
                }
                C.cwd(cwd[0]);
            }
            for (let key of ['out', 'err', 'combined']) {
                if (!(key in descriptor)) continue;
                for (let item of (Array.isArray(descriptor[key]) ? descriptor[key].flat() : [descriptor[key]])) {
                    C[key](item);
                }
            }
        });
    }

    static #validateCommandDescriptorSchema(descriptor)
    {
        const itemType = ducktype(String,AID,Artifact,Dependency,ducktype({artifact: Artifact}));
        CommandRecipe.#createDescriptorValidator(itemType).validate(descriptor);
    }

    static #createDescriptorValidator(itemType)
    {
        const items = recursive(items => ducktype(itemType, [items]));
        const sink = ducktype(itemType, Function, Boolean);
        const sinks = recursive(sinks => ducktype(sink, [sinks]));
        const opt = { optional: true };
        const descriptorValidator = ducktype(
            {
                cmd: items,
                args: ducktype(items, opt),
                cwd: ducktype(itemType, [itemType], opt),
                env: dictionary(items, opt),
                out: ducktype(sinks, opt),
                err: ducktype(sinks, opt),
                combined: ducktype(sinks, opt)
            }
        )
        return ducktype(descriptorValidator, String);
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
    if (true===sink) return true;
    const resolve = job.build.artifactManager.resolveToExternalIdentifier.bind(job.build.artifactManager);
    if (Array.isArray(sink)) {
        throw new OutputSinkIsArray();
    }
    if ('function'===typeof sink) {
        return (
            sink.length > 1
                ? function(chunk, ...rest) { sink(job, chunk, ...rest); }
                : sink
        );
    }
    if (sink instanceof FileArtifact) {
        return captureTo(resolve(sink.identity),job);
    }
    if ('object' === typeof sink && 'function' === typeof sink.toString) {
        sink = sink.artifact || sink.toString();
    }
    if (('string'===typeof sink) || (sink instanceof AID)) {
        sink = job.build.artifactManager.get(sink);
    }
    if (sink instanceof FileArtifact) {
        return captureTo(resolve(sink.identity),job);
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

