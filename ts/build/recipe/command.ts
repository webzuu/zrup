import {Job} from "../job.js";
import {ChildProcessWithoutNullStreams, spawn} from "child_process";
import fs from "fs";
import * as path from "path";
import {Readable} from "stream";
import {AID, Artifact} from "../../graph/artifact.js";
import {FileArtifact} from "../../graph/artifact/file.js";
import {Dependency} from "../../graph/dependency.js";
import {Module, ResolveArtifactResult, resolveArtifacts} from "../../module.js";
import {reassemble, templateStringTag} from "../../util/tagged-template.js";
import {Recipe} from "../recipe.js";
import outputListener = CommandRecipe.outputListener;
import builder = CommandRecipe.builder;
import CommandSpecifier = CommandRecipe.CommandSpecifier;
import Config = CommandRecipe.Config;
import ConcretizedSpec = CommandRecipe.ConcretizedSpec;
import jobOutputListener = CommandRecipe.jobOutputListener;
import simpleDescriptorBuilder = CommandRecipe.simpleDescriptorBuilder;
import CommandSpecifiers = CommandRecipe.CommandSpecifiers;
import ArgumentSpecifier = CommandRecipe.ArgumentSpecifier;
import OutputSink = CommandRecipe.OutputSink;
import outputListenerAcceptor = CommandRecipe.outputListenerAcceptor;
import {RuleBuilder} from "../../front/rule-builder.js";
import OutputListenerDescriptor = CommandRecipe.OutputListenerDescriptor;
import {EmptyWorkaround, ValueOrArray} from "../../util/types.js";

/***/
export class CommandRecipe extends Recipe {
    readonly #commandBuilder: builder;

    private readonly stdoutChunks : string[] = [];

    private readonly stderrChunks : string[] = [];

    private readonly combinedChunks : string[] = [];

    constructor(commandBuilder: builder) {
        super();
        this.#commandBuilder = commandBuilder.bind(null);
    }

    createChildProcess(job: Job, config: CommandRecipe.Config): ChildProcessWithoutNullStreams {
        let {exec, shell, args, cwd, out, err, combined} = config;
        const options: Record<string, any> = {};
        //resolve cwd
        const resolved = resolveArtifacts(
            job.build.artifactManager,
            job.rule.module,
            false,
            ...[cwd ?? (job.rule.module.name + '+')].flat(Infinity)
        )[0];
        if (undefined === resolved) {
            throw new Error(`Could not resolve ${cwd} as working directory specification`);
        }
        options.cwd = resolved.toString()

        if (shell) options.shell = "/bin/bash";
        exec = exec.replace(/^\s+/, '').replace(/\s+$/, '');
        const rawExec = exec + '';
        if (shell) exec = `set -euo pipefail; ${exec}`;
        job.build.emit('spawning.command', job, rawExec, args, options);
        const child = spawn(exec, args, options);
        job.build.emit('spawned.command', job, rawExec, args, child);

        this.hookStreams(child, out, err, combined);

        return child;
    }

    hookStreams(
        child: ChildProcessWithoutNullStreams,
        out: outputListener[],
        err: outputListener[],
        combined: outputListener[]
    ) {

        this.stdoutChunks.length=0;
        this.stderrChunks.length=0;
        this.combinedChunks.length=0;

        let stdoutRedirected = out.length > 0,
            stderrRedirected = err.length > 0,
            combinedRedirected = stdoutRedirected || stderrRedirected || combined.length > 0;

        const
            outSpec = !stdoutRedirected ? [captureToArray(this.stdoutChunks)] : out,
            errSpec = !stderrRedirected ? [captureToArray(this.stderrChunks)] : err,
            combinedSpec = !combinedRedirected ? [captureToArray(this.combinedChunks)] : combined;

        for (let listener of outSpec) addDataListenerToStreams(listener, child, child.stdout);
        for (let listener of errSpec) addDataListenerToStreams(listener, child, child.stderr);
        for (let listener of combinedSpec) addDataListenerToStreams(listener, child, child.stdout, child.stderr)
    }

    get stdout(): string {
        return this.stdoutChunks.join('');
    }

    get stderr(): string {
        return this.stderrChunks.join('');
    }

    get combined(): string {
        return this.combinedChunks.join('');
    }

    get consoleOutput(): string {
        return this.combinedChunks.length ? this.combined : this.stdout + this.stderr;
    }

    createCompletionPromise(child: ChildProcessWithoutNullStreams, job: Job, config: CommandRecipe.Config): Promise<void> {
        return new Promise((resolve, reject) => {
            child.on('exit', (code, signal) => {
                if (code !== 0 || signal) {
                    reject(new CommandError(job, config.exec.trimStart().trimEnd(), code, signal));
                } else {
                    job.build.emit('completed.command', job, child);
                    resolve();
                }
            });
        });
    }

    makeOutputSink(
        job: Job,
        sink: CommandRecipe.OutputSink | CommandRecipe.jobOutputListener
    ): CommandRecipe.outputListener {
        if (Array.isArray(sink)) {
            throw new OutputSinkIsArray();
        }

        function isOutputListener(sink: CommandRecipe.OutputSink | CommandRecipe.jobOutputListener): sink is outputListener {
            return "function" === typeof sink && sink.length === 1;
        }

        if (isOutputListener(sink)) return sink;

        function isJobListener(sink: CommandRecipe.OutputSink | CommandRecipe.jobOutputListener): sink is jobOutputListener {
            return "function" === typeof sink && sink.length > 1;
        }

        if (isJobListener(sink)) {
            return Object.assign(
                function (chunk: string, ...rest: string[]): any {
                    sink(job, chunk, ...rest);
                },
                {
                    descriptor: sink.descriptor
                }
            )
        }

        if (sink instanceof FileArtifact) {
            return makeOutputSinkFromArtifact(job, sink);
        }
        if ('object' === typeof sink && 'function' === typeof sink.toString && 'artifact' in sink) {
            return makeOutputSinkFromArtifactResolutionResult(job, sink);
        }
        if (('string' === typeof sink) || (sink instanceof AID)) {
            return makeOutputSinkFromArtifact(job, job.build.artifactManager.get(sink))
        }
        throw new Error("Output sink must be an artifact reference or a callback");
    }

    async concretizeSpecFor(job: Job): Promise<ConcretizedSpec> {

        const spec: ConcretizedSpec = {
            job,
            exec: "",
            shell: false,
            args: [],
            out: [],
            err: [],
            combined: []
        };

        const resolve = resolveArtifacts.bind(null, job.build.artifactManager, job.rule.module, false);
        const resolveExceptStrings:
            (...refs: Artifact.Resolvables[]) => (string | ResolveArtifactResult)[] =
            resolveArtifacts.bind(null, job.build.artifactManager, job.rule.module, true);

        const me = this;

        function createOutputListenerAcceptor(
            listeners: outputListener[],
            job: Job,
            defaultBuffer: string[]
        ): outputListenerAcceptor {
            return function (sink: OutputSink) {
                if (false === sink) return;
                listeners.push(
                    true === sink
                        ? captureToArray(defaultBuffer)
                        : me.makeOutputSink(job, sink)
                );
            }
        }

        const builderParams: CommandRecipe.BuilderParams = {

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
            T: reassemble.bind(
                null,
                ref => resolveArtifacts(
                    job.build.artifactManager,
                    job.rule.module,
                    false,
                    ref
                )[0]?.toString() ?? ""
            )
        }

        this.#commandBuilder(builderParams);

        return spec;
    }

    async executeFor(job: Job, spec: Config) {
        const child = this.createChildProcess(job, spec);
        await this.createCompletionPromise(child, job, spec);
    }

    describeSpec(spec: ConcretizedSpec) {
        const getDescriber = (sink: outputListener) : OutputListenerDescriptor => sink.descriptor;
        const result: Record<string, any> = {};
        result.exec = spec.exec;
        result.shell = spec.shell;
        result.args = spec.args;
        result.cwd = spec.cwd;
        result.out = spec.out.map(getDescriber);
        result.err = spec.err.map(getDescriber);
        result.combined = spec.combined.map(getDescriber);
        return result;
    }

    static to(ruleBuilder: RuleBuilder, module: Module, ruleName: string, descriptorProvider: simpleDescriptorBuilder) {
        ruleBuilder.acceptDefiner(
            module,
            ruleName,
            CommandRecipe.createShellCommandRuleDefiner(module, descriptorProvider)
        )
    }

    private static createShellCommandRuleDefiner(
        module: Module,
        descriptorProvider: CommandRecipe.simpleDescriptorBuilder
    ): RuleBuilder.definer {
        return (R : RuleBuilder.DefinerParams) => {
            return CommandRecipe.fromSimpleDescriptor(module, CommandRecipe.redeemDescriptorProvider(R, descriptorProvider));
        };
    }

    static redeemDescriptorProvider(
        R: RuleBuilder.DefinerParams,
        provider: CommandRecipe.simpleDescriptorBuilder | string
    ): CommandRecipe.SimpleDescriptor {
        //TODO: provider comes from outside, validate it more!
        return this.normalizeDescriptor('function' === typeof provider ? provider(R) : provider);
    }

    private static normalizeDescriptor(descriptor: CommandRecipe.SimpleDescriptor | string) : CommandRecipe.SimpleDescriptor
    {
        return 'string' === typeof descriptor ? { cmd: descriptor } : descriptor;
    }

    static fromSimpleDescriptor(module: Module, descriptor: CommandRecipe.SimpleDescriptor) {
        return new CommandRecipe((C: CommandRecipe.BuilderParams) => {

            CommandRecipe.validateCommandDescriptorSchema(descriptor);
            const commandSegments: CommandSpecifier[] = [descriptor.cmd].flat(Infinity) as CommandSpecifier[];
            const firstCommandSegment = commandSegments[0] as CommandSpecifier;
            if (undefined === firstCommandSegment) {
                throw new Error(`Invalid command recipe: command cannot be empty`);
            }
            C.shell(firstCommandSegment, ...(commandSegments.slice(1) as CommandSpecifier[]));
            if ('args' in descriptor) {
                C.args(...([descriptor.args].flat(Infinity) as ArgumentSpecifier[]))
            }
            if ('cwd' in descriptor) {
                const cwd = [descriptor.cwd].flat(Infinity);
                if (cwd.length !== 1) {
                    //TODO: throw InvalidSpecification
                    throw new Error("Invalid specification: cwd must be a single item")
                }
                C.cwd(cwd[0] as string);
            }
            if ('out' in descriptor) ([descriptor.out].flat(Infinity) as OutputSink[]).forEach(C.out.bind(C));
            if ('err' in descriptor) ([descriptor.err].flat(Infinity) as OutputSink[]).forEach(C.err.bind(C));
            if ('combined' in descriptor) ([descriptor.combined].flat(Infinity) as OutputSink[]).forEach(C.combined.bind(C));
        });
    }


    // noinspection JSUnusedLocalSymbols
    private static validateCommandDescriptorSchema(descriptor: any) : boolean {
        return true;
    }
}

/***/
export namespace CommandRecipe {
    export type CommandSpecifier = string|Artifact|AID|Dependency|ResolveArtifactResult;
    export type CommandSpecifiers = ValueOrArray<EmptyWorkaround<CommandSpecifier>>;
    export type commandAcceptor = (command: CommandSpecifier, ...args: CommandSpecifier[]) => any;
    export type ArgumentSpecifier = CommandSpecifier;
    export type ArgumentSpecifiers = ValueOrArray<EmptyWorkaround<ArgumentSpecifier>>;
    export type argumentsAcceptor = (...args: ArgumentSpecifier[]) => any;
    export type OutputListenerDescriptor = {
        action: string,
    } & Record<string, any>;
    export type FileArtifactWriterDescriptor = OutputListenerDescriptor & {
        action: "write to file artifact",
        artifact: string
    }
    export type Described = { descriptor: OutputListenerDescriptor; }
    export type outputListener = ((chunk: string) => any) & Described;
    export type jobOutputListener = ((job: Job, chunk: string, ...rest : string[]) => any) & Described;
    export type outputListenerAcceptor = (listener: OutputSink) => any;
    export type cwdAcceptor = (cwd: string) => any;
    export type templateTransformer = (strings: string[], ...variables: any[]) => string
    export type BuilderParams = {
        //job:        Job,
        exec:       commandAcceptor,
        shell:      argumentsAcceptor,
        args:       argumentsAcceptor,
        cwd:        cwdAcceptor,
        out:        outputListenerAcceptor,
        err:        outputListenerAcceptor,
        combined:   outputListenerAcceptor,
        resolve:    (...refs: Artifact.Resolvables[]) => (string|ResolveArtifactResult)[],
        T:          templateStringTag
    }
    export type Config = {
        exec:           string,
        shell:          boolean,
        args:           string[],
        cwd?:           string,
        out:            outputListener[],
        err:            outputListener[],
        combined:       outputListener[]
    }
    export type ConcretizedSpec = {
        job: Job,
        exec: CommandRecipe.CommandSpecifier,
        shell: string|boolean,
        args: (string|ResolveArtifactResult)[],
        cwd?: string|ResolveArtifactResult,
        out: outputListener[],
        err: outputListener[],
        combined: outputListener[]
    }
    export type OutputSink = Artifact.Resolvable|outputListener|boolean;
    export type OutputSinks = ValueOrArray<EmptyWorkaround<OutputSink>>;
    export type outputSinkDescriber = (sink: outputListener) => OutputListenerDescriptor;
    export type CommandSegment = Artifact.Resolvable|string;
    export type CommandSegments = ValueOrArray<EmptyWorkaround<CommandSegment>>;
    export type  SimpleDescriptor = {
        cmd:                    CommandSpecifiers,
        args?:                  ArgumentSpecifiers,
        cwd?:                   Artifact.Resolvable,
        env?:                   Record<string, Artifact.Resolvables>,
        shell?:                 string|boolean,
        out?:                   OutputSinks,
        err?:                   OutputSinks,
        combined?:              OutputSinks
    }
    export type builder<P=BuilderParams, T=any> = (params: P) => T;
    export type simpleDescriptorBuilder = builder<RuleBuilder.DefinerParams, SimpleDescriptor | string>;
    export type simpleDescriptorBuilderAcceptor =
        (ruleName: string, descriptorProvider: simpleDescriptorBuilder | string) => any
        | string;
}


/***/
export class CommandError extends Error

{
    constructor(job: Job, cmd: string, code: number | null, signal: string | null) {
        super(CommandError.formatMessage(job,cmd,code,signal))
    }

    static formatMessage(job: Job, cmd: string, code: number|null, signal: string|null): string
    {
        let msg = `${job.rule.label} recipe exited`;
        if (null !== code) msg += ` with code ${code}`;
        if (null !== signal) msg += ` (${signal})`;
        msg+="\ncommand: "+cmd;
        return msg;
    }
}

export function captureTo(artifactRef: Artifact.Reference,job: Job): outputListener
{
    const outputFilePath = job.build.artifactManager.resolveToExternalIdentifier(artifactRef);
    let append = false;
    const result : outputListener = (chunk : string|Buffer) => {
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

function stringifyChunk(chunk: string|Buffer) : string {
    return (
        'string'===typeof chunk
            ? chunk
            : chunk.toString("utf-8")
    );
}

function captureToArray(dest : (string)[]) {
    return Object.assign(
        (chunk : string|Buffer) => {
            const debugStringifiedChunk = stringifyChunk(chunk);
            dest.push(debugStringifiedChunk);
        },
        {
            descriptor: {
                action: "Capture stream to internal buffer"
            }
        }
    );
}

class OutputSinkIsArray extends Error {}

function makeOutputSinkFromArtifactResolutionResult(
    job: Job,
    sink : ResolveArtifactResult
) : outputListener {
    return makeOutputSinkFromArtifact(job, sink.artifact);
}

function makeOutputSinkFromArtifact(
    job: Job,
    sink: Artifact
) : outputListener {
    const resolve = job.build.artifactManager.resolveToExternalIdentifier.bind(job.build.artifactManager);
    return captureTo(resolve(sink.identity),job);
}

function addDataListenerToStreams(listener: CommandRecipe.outputListener, child: ChildProcessWithoutNullStreams, ...streams: Readable[])
{
    for(let stream of streams) {
        stream.on('data', listener);
    }
    child.on('exit', () => { listener(''); });
}

