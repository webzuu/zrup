/// <reference types="node" />
import { Job } from "../job.js";
import { ChildProcessWithoutNullStreams } from "child_process";
import { AID, Artifact } from "../../graph/artifact.js";
import { Dependency } from "../../graph/dependency.js";
import { Module, ResolveArtifactResult } from "../../module.js";
import { templateStringTag } from "../../util/tagged-template.js";
import { Recipe } from "../recipe.js";
import outputListener = CommandRecipe.outputListener;
import builder = CommandRecipe.builder;
import Config = CommandRecipe.Config;
import ConcretizedSpec = CommandRecipe.ConcretizedSpec;
import simpleDescriptorBuilder = CommandRecipe.simpleDescriptorBuilder;
import { RuleBuilder } from "../../front/rule-builder.js";
import { ValueOrArray } from "../../util/types.js";
/***/
export declare class CommandRecipe extends Recipe {
    #private;
    private readonly stdoutChunks;
    private readonly stderrChunks;
    private readonly combinedChunks;
    constructor(commandBuilder: builder);
    createChildProcess(job: Job, config: CommandRecipe.Config): ChildProcessWithoutNullStreams;
    hookStreams(child: ChildProcessWithoutNullStreams, out: outputListener[], err: outputListener[], combined: outputListener[]): void;
    get stdout(): string;
    get stderr(): string;
    get combined(): string;
    get consoleOutput(): string;
    createCompletionPromise(child: ChildProcessWithoutNullStreams, job: Job, config: CommandRecipe.Config): Promise<void>;
    makeOutputSink(job: Job, sink: CommandRecipe.OutputSink | CommandRecipe.jobOutputListener): CommandRecipe.outputListener;
    concretizeSpecFor(job: Job): Promise<ConcretizedSpec>;
    executeFor(job: Job, spec: Config): Promise<void>;
    describeSpec(spec: ConcretizedSpec): Record<string, any>;
    static to(ruleBuilder: RuleBuilder, module: Module, ruleName: string, descriptorProvider: simpleDescriptorBuilder): void;
    private static createShellCommandRuleDefiner;
    static redeemDescriptorProvider(R: RuleBuilder.DefinerParams, provider: CommandRecipe.simpleDescriptorBuilder | string): CommandRecipe.SimpleDescriptor;
    private static normalizeDescriptor;
    static fromSimpleDescriptor(module: Module, descriptor: CommandRecipe.SimpleDescriptor): CommandRecipe;
    private static validateCommandDescriptorSchema;
}
/***/
export declare namespace CommandRecipe {
    type CommandSpecifier = string | Artifact | AID | Dependency | ResolveArtifactResult;
    type CommandSpecifiers = CommandSpecifier | CommandSpecifiers[];
    type commandAcceptor = (command: CommandSpecifier, ...args: CommandSpecifier[]) => any;
    type ArgumentSpecifier = CommandSpecifier;
    type ArgumentSpecifiers = ArgumentSpecifier | ArgumentSpecifiers[];
    type argumentsAcceptor = (...args: ArgumentSpecifier[]) => any;
    type OutputListenerDescriptor = {
        action: string;
    } & Record<string, any>;
    type FileArtifactWriterDescriptor = OutputListenerDescriptor & {
        action: "write to file artifact";
        artifact: string;
    };
    type Described = {
        descriptor: OutputListenerDescriptor;
    };
    type outputListener = ((chunk: string) => any) & Described;
    type jobOutputListener = ((job: Job, chunk: string, ...rest: string[]) => any) & Described;
    type outputListenerAcceptor = (listener: OutputSink) => any;
    type cwdAcceptor = (cwd: string) => any;
    type templateTransformer = (strings: string[], ...variables: any[]) => string;
    type BuilderParams = {
        exec: commandAcceptor;
        shell: argumentsAcceptor;
        args: argumentsAcceptor;
        cwd: cwdAcceptor;
        out: outputListenerAcceptor;
        err: outputListenerAcceptor;
        combined: outputListenerAcceptor;
        resolve: (...refs: Artifact.Resolvables[]) => (string | ResolveArtifactResult)[];
        T: templateStringTag;
    };
    type Config = {
        exec: string;
        shell: boolean;
        args: string[];
        cwd?: string;
        out: outputListener[];
        err: outputListener[];
        combined: outputListener[];
    };
    type ConcretizedSpec = {
        job: Job;
        exec: CommandRecipe.CommandSpecifier;
        shell: string | boolean;
        args: (string | ResolveArtifactResult)[];
        cwd?: string | ResolveArtifactResult;
        out: outputListener[];
        err: outputListener[];
        combined: outputListener[];
    };
    type OutputSink = Artifact.Resolvable | outputListener | boolean;
    type OutputSinks = ValueOrArray<OutputSink>;
    type outputSinkDescriber = (sink: outputListener) => OutputListenerDescriptor;
    type CommandSegment = Artifact.Resolvable | string;
    type CommandSegments = ValueOrArray<CommandSegment>;
    type SimpleDescriptor = {
        cmd: CommandSpecifiers;
        args?: ArgumentSpecifiers;
        cwd?: Artifact.Resolvable;
        env?: Record<string, Artifact.Resolvables>;
        shell?: string | boolean;
        out?: OutputSinks;
        err?: OutputSinks;
        combined?: OutputSinks;
    };
    type builder<P = BuilderParams, T = any> = (params: P) => T;
    type simpleDescriptorBuilder = builder<RuleBuilder.DefinerParams, SimpleDescriptor | string>;
    type simpleDescriptorBuilderAcceptor = (ruleName: string, descriptorProvider: simpleDescriptorBuilder | string) => any | string;
}
/***/
export declare class CommandError extends Error {
    constructor(job: Job, cmd: string, code: number | null, signal: string | null);
    static formatMessage(job: Job, cmd: string, code: number | null, signal: string | null): string;
}
export declare function captureTo(artifactRef: Artifact.Reference, job: Job): outputListener;
//# sourceMappingURL=command.d.ts.map