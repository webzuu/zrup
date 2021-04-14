var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _commandBuilder;
import { spawn } from "child_process";
import fs from "fs";
import * as path from "path";
import { AID } from "../../graph/artifact.js";
import { FileArtifact } from "../../graph/artifact/file.js";
import { resolveArtifacts } from "../../module.js";
import { reassemble } from "../../util/tagged-template.js";
import { Recipe } from "../recipe.js";
/***/
export class CommandRecipe extends Recipe {
    constructor(commandBuilder) {
        super();
        _commandBuilder.set(this, void 0);
        this.stdoutChunks = [];
        this.stderrChunks = [];
        this.combinedChunks = [];
        __classPrivateFieldSet(this, _commandBuilder, commandBuilder.bind(null));
    }
    createChildProcess(job, config) {
        let { exec, shell, args, cwd, out, err, combined } = config;
        const options = {};
        //resolve cwd
        const resolved = resolveArtifacts(job.build.artifactManager, job.rule.module, false, ...[cwd ?? (job.rule.module.name + '+')].flat(Infinity))[0];
        if (undefined === resolved) {
            throw new Error(`Could not resolve ${cwd} as working directory specification`);
        }
        options.cwd = resolved.toString();
        if (shell)
            options.shell = "/bin/bash";
        exec = exec.replace(/^\s+/, '').replace(/\s+$/, '');
        const rawExec = exec + '';
        if (shell)
            exec = `set -euo pipefail; ${exec}`;
        job.build.emit('spawning.command', job, rawExec, args, options);
        const child = spawn(exec, args, options);
        job.build.emit('spawned.command', job, rawExec, args, child);
        this.hookStreams(child, out, err, combined);
        return child;
    }
    hookStreams(child, out, err, combined) {
        this.stdoutChunks.length = 0;
        this.stderrChunks.length = 0;
        this.combinedChunks.length = 0;
        let stdoutRedirected = out.length > 0, stderrRedirected = err.length > 0, combinedRedirected = stdoutRedirected || stderrRedirected || combined.length > 0;
        const outSpec = !stdoutRedirected ? [captureToArray(this.stdoutChunks)] : out, errSpec = !stderrRedirected ? [captureToArray(this.stderrChunks)] : err, combinedSpec = !combinedRedirected ? [captureToArray(this.combinedChunks)] : combined;
        for (let listener of outSpec)
            addDataListenerToStreams(listener, child, child.stdout);
        for (let listener of errSpec)
            addDataListenerToStreams(listener, child, child.stderr);
        for (let listener of combinedSpec)
            addDataListenerToStreams(listener, child, child.stdout, child.stderr);
    }
    get stdout() {
        return this.stdoutChunks.join('');
    }
    get stderr() {
        return this.stderrChunks.join('');
    }
    get combined() {
        return this.combinedChunks.join('');
    }
    get consoleOutput() {
        return this.combinedChunks.length ? this.combined : this.stdout + this.stderr;
    }
    createCompletionPromise(child, job, config) {
        return new Promise((resolve, reject) => {
            child.on('exit', (code, signal) => {
                if (code !== 0 || signal) {
                    reject(new CommandError(job, config.exec.trimStart().trimEnd(), code, signal));
                }
                else {
                    job.build.emit('completed.command', job, child);
                    resolve();
                }
            });
        });
    }
    makeOutputSink(job, sink) {
        if (Array.isArray(sink)) {
            throw new OutputSinkIsArray();
        }
        function isOutputListener(sink) {
            return "function" === typeof sink && sink.length === 1;
        }
        if (isOutputListener(sink))
            return sink;
        function isJobListener(sink) {
            return "function" === typeof sink && sink.length > 1;
        }
        if (isJobListener(sink)) {
            return Object.assign(function (chunk, ...rest) {
                sink(job, chunk, ...rest);
            }, {
                descriptor: sink.descriptor
            });
        }
        if (sink instanceof FileArtifact) {
            return makeOutputSinkFromArtifact(job, sink);
        }
        if ('object' === typeof sink && 'function' === typeof sink.toString && 'artifact' in sink) {
            return makeOutputSinkFromArtifactResolutionResult(job, sink);
        }
        if (('string' === typeof sink) || (sink instanceof AID)) {
            return makeOutputSinkFromArtifact(job, job.build.artifactManager.get(sink));
        }
        throw new Error("Output sink must be an artifact reference or a callback");
    }
    async concretizeSpecFor(job) {
        const spec = {
            job,
            exec: "",
            shell: false,
            args: [],
            out: [],
            err: [],
            combined: []
        };
        const resolve = resolveArtifacts.bind(null, job.build.artifactManager, job.rule.module, false);
        const resolveExceptStrings = resolveArtifacts.bind(null, job.build.artifactManager, job.rule.module, true);
        const me = this;
        function createOutputListenerAcceptor(listeners, job, defaultBuffer) {
            return function (sink) {
                if (false === sink)
                    return;
                listeners.push(true === sink
                    ? captureToArray(defaultBuffer)
                    : me.makeOutputSink(job, sink));
            };
        }
        const builderParams = {
            exec: (cmdString, ...argItems) => {
                spec.exec = cmdString;
                spec.args.push(...resolveExceptStrings(...argItems.flat(Infinity)).map(_ => '' + _));
            },
            shell: (...argItems) => {
                spec.exec = resolveExceptStrings(...argItems.flat(Infinity)).map(_ => '' + _).join(" ");
                spec.shell = true;
            },
            args: (...argItems) => {
                spec.args.push(...resolveExceptStrings(...argItems.flat(Infinity)).map(_ => '' + _));
            },
            cwd: cwdValue => {
                spec.cwd = cwdValue;
            },
            out: createOutputListenerAcceptor(spec.out, job, this.stdoutChunks),
            err: createOutputListenerAcceptor(spec.err, job, this.stderrChunks),
            combined: createOutputListenerAcceptor(spec.combined, job, this.combinedChunks),
            resolve,
            T: reassemble.bind(null, ref => resolveArtifacts(job.build.artifactManager, job.rule.module, false, ref)[0]?.toString() ?? "")
        };
        __classPrivateFieldGet(this, _commandBuilder).call(this, builderParams);
        return spec;
    }
    async executeFor(job, spec) {
        const child = this.createChildProcess(job, spec);
        await this.createCompletionPromise(child, job, spec);
    }
    describeSpec(spec) {
        const getDescriber = (sink) => sink.descriptor;
        const result = {};
        result.exec = spec.exec;
        result.shell = spec.shell;
        result.args = spec.args;
        result.cwd = spec.cwd;
        result.out = spec.out.map(getDescriber);
        result.err = spec.err.map(getDescriber);
        result.combined = spec.combined.map(getDescriber);
        return result;
    }
    static to(ruleBuilder, module, ruleName, descriptorProvider) {
        ruleBuilder.acceptDefiner(module, ruleName, CommandRecipe.createShellCommandRuleDefiner(module, descriptorProvider));
    }
    static createShellCommandRuleDefiner(module, descriptorProvider) {
        return (R) => {
            return CommandRecipe.fromSimpleDescriptor(module, CommandRecipe.redeemDescriptorProvider(R, descriptorProvider));
        };
    }
    static redeemDescriptorProvider(R, provider) {
        //TODO: provider comes from outside, validate it more!
        return this.normalizeDescriptor('function' === typeof provider ? provider(R) : provider);
    }
    static normalizeDescriptor(descriptor) {
        return 'string' === typeof descriptor ? { cmd: descriptor } : descriptor;
    }
    static fromSimpleDescriptor(module, descriptor) {
        return new CommandRecipe((C) => {
            CommandRecipe.validateCommandDescriptorSchema(descriptor);
            const commandSegments = [descriptor.cmd].flat(Infinity);
            const firstCommandSegment = commandSegments[0];
            if (undefined === firstCommandSegment) {
                throw new Error(`Invalid command recipe: command cannot be empty`);
            }
            C.shell(firstCommandSegment, ...commandSegments.slice(1));
            if ('args' in descriptor) {
                C.args(...[descriptor.args].flat(Infinity));
            }
            if ('cwd' in descriptor) {
                const cwd = [descriptor.cwd].flat(Infinity);
                if (cwd.length !== 1) {
                    //TODO: throw InvalidSpecification
                    throw new Error("Invalid specification: cwd must be a single item");
                }
                C.cwd(cwd[0]);
            }
            if ('out' in descriptor)
                [descriptor.out].flat(Infinity).forEach(C.out.bind(C));
            if ('err' in descriptor)
                [descriptor.err].flat(Infinity).forEach(C.err.bind(C));
            if ('combined' in descriptor)
                [descriptor.combined].flat(Infinity).forEach(C.combined.bind(C));
        });
    }
    // noinspection JSUnusedLocalSymbols
    static validateCommandDescriptorSchema(descriptor) {
        return true;
    }
}
_commandBuilder = new WeakMap();
/***/
export class CommandError extends Error {
    constructor(job, cmd, code, signal) {
        super(CommandError.formatMessage(job, cmd, code, signal));
    }
    static formatMessage(job, cmd, code, signal) {
        let msg = `${job.rule.label} recipe exited`;
        if (null !== code)
            msg += ` with code ${code}`;
        if (null !== signal)
            msg += ` (${signal})`;
        msg += "\ncommand: " + cmd;
        return msg;
    }
}
export function captureTo(artifactRef, job) {
    const outputFilePath = job.build.artifactManager.resolveToExternalIdentifier(artifactRef);
    let append = false;
    const result = (chunk) => {
        if (!append) {
            fs.mkdirSync(path.dirname(outputFilePath), { mode: 0o755, recursive: true });
            fs.writeFileSync(outputFilePath, chunk);
            job.build.emit('capturing.output', job, outputFilePath);
            append = true;
        }
        else {
            fs.appendFileSync(outputFilePath, chunk);
        }
    };
    result.descriptor = {
        action: "write to file artifact",
        artifact: artifactRef + ''
    };
    return result;
}
function stringifyChunk(chunk) {
    return ('string' === typeof chunk
        ? chunk
        : chunk.toString("utf-8"));
}
function captureToArray(dest) {
    return Object.assign((chunk) => {
        const debugStringifiedChunk = stringifyChunk(chunk);
        dest.push(debugStringifiedChunk);
    }, {
        descriptor: {
            action: "Capture stream to internal buffer"
        }
    });
}
class OutputSinkIsArray extends Error {
}
function makeOutputSinkFromArtifactResolutionResult(job, sink) {
    return makeOutputSinkFromArtifact(job, sink.artifact);
}
function makeOutputSinkFromArtifact(job, sink) {
    const resolve = job.build.artifactManager.resolveToExternalIdentifier.bind(job.build.artifactManager);
    return captureTo(resolve(sink.identity), job);
}
function addDataListenerToStreams(listener, child, ...streams) {
    for (let stream of streams) {
        stream.on('data', listener);
    }
    child.on('exit', () => { listener(''); });
}
//# sourceMappingURL=command.js.map