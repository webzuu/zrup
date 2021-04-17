declare interface __emptyClassWorkaround {}
declare type EmptyWorkaround<T> = T | __emptyClassWorkaround;
declare type ValueOrArray<T> = T | ValueOrArray<T>[];

declare class Dependency {
    #private;
    constructor(artifact: Artifact, whenAbsent: Dependency.Absent);
    get artifact(): Artifact;
    get whenAbsent(): Dependency.Absent;
    static readonly ABSENT_VIOLATION = 0;
    static readonly ABSENT_STATE = 1;
}

declare class Job {
    #private;
    readonly build: Build;
    readonly rule: Rule;
    recipeInvoked: boolean;
    recipeArtifact: RecipeArtifact;
    promise: Promise<this> | null;
    finished: boolean;
    outputs: Artifact[];
    dynamicOutputs: Artifact[];
    error: Error | null;
    requestedBy: Job | null;
    dependencies: Dependency[];
    recordedDependencies: Dependency[];
    constructor(build: Build, rule: Rule);
    run(): Promise<this>;
    private guardedWork;
    private also;
    /**
     * The main build algorithm
     */
    private work;
    verifyBuiltDependency: (dependency: Dependency) => Promise<void>;
    private getPrerequisiteRuleKeysToDependencyType;
    /**
     * @returns {Promise<JobSet>}
     */
    private getPrerequisiteJobSet;
    private getMergedDependencies;
    prepare(): void;
    detectRewritesAfterUse(): Promise<void>;
    detectRewriteAfterUse(outputArtifact: Artifact): Promise<string | null>;
    collectDependencies(): void;
    artifactFromRecord(record: ArtifactRecord): Artifact;
    get artifacts(): Artifact[];
    preCollectOutputs(): void;
    readAutoDependenciesFile(ref: Artifact.Reference): Promise<object[]>;
    readAutoOutputsFile(ref: Artifact.Reference): Promise<object[]>;
    readVersionFileList(ref: Artifact.Reference, artifactType?: string): Promise<VersionFileListEntry[]>;
}

declare class Rule {
    #private;
    outputs: Record<string, Artifact>;
    dependencies: Record<string, Dependency>;
    also: Record<string, Rule>;
    after: Record<string, Rule>;
    always: boolean;
    constructor(module: Module, name: string);
    get module(): Module;
    get name(): string;
    get identity(): string;
    get recipe(): Recipe | null;
    get validRecipe(): Recipe;
    set recipe(recipe: Recipe | null);
    static computeKey(identityString: string): string;
    get key(): string;
    set label(label: string | null);
    get label(): string | null;
    formatDefaultLabel(): string;
    addDependency(artifact: Artifact, whenAbsent: Dependency.Absent): Dependency;
    addAlso(rule: Rule): void;
    addOutput(artifact: Artifact): Artifact;
}

declare class Module {
    #private;
    constructor(parent: Module | null, path: string, name?: string);
    get project(): Project | null;
    get validProject(): Project;
    get parent(): Module | null;
    get pathFromRoot(): string;
    get name(): string;
    get absolutePath(): string;
    resolve(ref: Artifact.Reference): string;
    export(exports: Record<string, any>): void;
    get exports(): Record<string, any>;
    static createRoot(project: Project, name: string): Module;
}

declare interface ResolveArtifactResult {
    toString(): string;
    artifact: Artifact;
}

declare abstract class Artifact {
    #private;
    protected constructor(aid: Artifact.Reference);
    get type(): string;
    static computeKey(type: string, identity: string): string;
    get key(): string;
    abstract get version(): Promise<string>;
    abstract get exists(): Promise<boolean>;
    get identity(): string;
    get label(): string;
    abstract rm(): Promise<void>;
    static readonly NONEXISTENT_VERSION = "[nonexistent]";
    get caps(): Artifact.Caps;
    private validate;
}

declare class AID {
    #private;
    constructor(aidString: string);
    get type(): string | undefined;
    get module(): string | undefined;
    get ref(): string;
    withType(type?: string): AID;
    withModule(module?: string): AID;
    withRef(ref: string): AID;
    withDefaults(descriptor: Partial<Artifact.Descriptor>): AID;
    get descriptor(): Artifact.Descriptor;
    static descriptorToString(descriptor: Artifact.Descriptor): string;
    toString(): string;
    static parse(aid: string): Artifact.Descriptor | false;
    static parseCorrectly(aid: string): Artifact.Descriptor;
}

declare class ArtifactManager {
    #private;
    constructor(defaultType?: string);
    addFactory(factory: ArtifactFactory): void;
    getFactoryForType(type: string | undefined, require?: boolean): ArtifactFactory | null;
    requireFactoryForType(type: string | undefined): ArtifactFactory;
    normalizeAID(aid: AID): AID;
    find(ref: Artifact.Reference): Artifact | null;
    get(ref: Artifact.Reference): Artifact;
    put(artifact: Artifact): void;
    private putNew;
    get allReferences(): string[];
    private create;
    resolveToExternalIdentifier(ref: Artifact.Reference): string;
}

declare abstract class ArtifactResolver {
    normalize(aid: AID): AID;
    abstract get type(): string;
    abstract resolveToExternalIdentifier(aid: AID): string;
}

declare abstract class ArtifactFactory {
    #private;
    protected constructor(manager: ArtifactManager, artifactConstructor: Artifact.ClassConstructor, artifactResolver: ArtifactResolver, type?: string);
    get artifactConstructor(): Artifact.ClassConstructor;
    get type(): string;
    normalize(aid: AID): AID;
    make(aid: Artifact.Reference, ...extra: any): Artifact;
    makeFromNormalized(aid: AID, ...extra: any): Artifact;
    prependRequiredConstructorArgs(ref: Artifact.Reference, extraArgs?: any[]): any[];
    resolveToExternalIdentifier(aid: AID): string;
    get resolver(): ArtifactResolver;
    static get type(): string;
}

declare class FileArtifact extends Artifact {
    #private;
    constructor(ref: Artifact.Reference, resolvedPath: string);
    get exists(): Promise<boolean>;
    get version(): Promise<string>;
    get contents(): Promise<string>;
    getContents(): Promise<string>;
    rm(): Promise<void>;
    truncate(): Promise<void>;
    append(str: string): Promise<void>;
    putContents(contents: string): Promise<void>;
    get caps(): Artifact.Caps;
}

declare class CommandRecipe extends Recipe {
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

declare class RuleBuilder extends EventEmitter {
    #private;
    protected readonly project: Project;
    readonly artifactManager: ArtifactManager;
    constructor(project: Project, artifactManager: ArtifactManager);
    bindDefinerAcceptor(module: Module): RuleBuilder.definerAcceptor;
    acceptDefiner(module: Module, name: string, definer: RuleBuilder.definer): void;
    acceptDefiner(module: Module, definer: RuleBuilder.definer): void;
    private createDeclaration;
    private bindDefiner;
    private bindDefinerArgs;
    depends: RuleBuilder.artifactNominator;
    produces: RuleBuilder.artifactNominator;
    after: RuleBuilder.ruleNominator;
    also: RuleBuilder.ruleNominator;
    private declareRuleEdges;
    always: RuleBuilder.flagSetter;
    requireCurrentRule(bindingName: string): Rule;
    finalize(): void;
    private defineRules;
    private indexRules;
    private addRuleEdges;
    addPrerequisiteRule(dependentRule: Rule, prerequisiteRuleRef: string): void;
    addAlsoRule(inducingRule: Rule, inducedRuleRef: string): void;
    locateRule(referentRule: Rule, anotherRuleRef: string): RuleBuilder.LocateResult;
    requireRule(referentRule: Rule, anotherRuleRef: string, errorMessage: string): Rule;
}

declare module "zrup-dsl" {
    global {
        namespace Dependency  {
            enum Absent {
                Violation = 0,
                State = 1
            }
        }
        
        namespace Artifact  {
            type ClassConstructor = {
                new (aid: Reference, ...args: any): Artifact;
                type?: string;
            };
            type Caps = {
                canWrite: boolean;
                canRemove: boolean;
                canBuild: boolean;
            };
            type Reference = string | AID;
            type References = ValueOrArray<EmptyWorkaround<Reference>>;
            type Resolvable = Reference | Artifact | Dependency | ResolveArtifactResult;
            type Resolvables = ValueOrArray<EmptyWorkaround<Resolvable>>;
            type Descriptor = {
                type?: string;
                module?: string;
                ref: string;
            };
        }
        
        namespace CommandRecipe  {
            type CommandSpecifier = string | Artifact | AID | Dependency | ResolveArtifactResult;
            type CommandSpecifiers = ValueOrArray<EmptyWorkaround<CommandSpecifier>>;
            type commandAcceptor = (command: CommandSpecifier, ...args: CommandSpecifier[]) => any;
            type ArgumentSpecifier = CommandSpecifier;
            type ArgumentSpecifiers = ValueOrArray<EmptyWorkaround<ArgumentSpecifier>>;
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
            type OutputSinks = ValueOrArray<EmptyWorkaround<OutputSink>>;
            type outputSinkDescriber = (sink: outputListener) => OutputListenerDescriptor;
            type CommandSegment = Artifact.Resolvable | string;
            type CommandSegments = ValueOrArray<EmptyWorkaround<CommandSegment>>;
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
        
        namespace ModuleBuilder  {
            type definerAcceptor = (nameOrDefiner: string | definer, definerOpt?: definer | undefined) => any;
            type definer = (params: DefinerParams) => any;
            type DefinerParams = {
                module: Module;
                include: includeNominator;
                rule: RuleBuilder.definerAcceptor;
                depends: RuleBuilder.artifactNominator;
                produces: RuleBuilder.artifactNominator;
                after: RuleBuilder.ruleNominator;
                to: CommandRecipe.simpleDescriptorBuilderAcceptor;
                always: RuleBuilder.flagSetter;
                also: RuleBuilder.ruleNominator;
                resolve: ModuleBuilder.resolve;
                API: ZrupAPI;
            };
            type resolve = (items: Artifact.Resolvables) => (string | ResolveArtifactResult)[];
            type includeNominator = (...includes: string[]) => Promise<string[]>;
            type Descriptor = {
                name: string;
                definer: definer;
            };
        }
        
        namespace RuleBuilder  {
            type definerAcceptor = (nameOrDefiner: string | definer, definerOpt?: definer) => any;
            type definer = (params: DefinerParams) => Recipe;
            type DefinerParams = {
                rule: Rule;
                depends: RuleBuilder.artifactNominator;
                produces: RuleBuilder.artifactNominator;
                after: RuleBuilder.ruleNominator;
                always: RuleBuilder.flagSetter;
                resolve: ModuleBuilder.resolve;
                T: templateStringTag;
            };
            type artifactNominator = (...resolvables: Artifact.Resolvables[]) => any;
            type ruleNominator = (...ruleRefs: string[]) => any;
            type flagSetter = (value?: boolean) => any;
            type boundDefiner = (...args: any[]) => Recipe;
            type Declaration = {
                module: Module;
                rule: Rule;
                boundDefiner: RuleBuilder.boundDefiner;
            };
            type LocateResult = {
                rule: Rule | null;
                resolvedRef: string;
            };
        }
    }
}
