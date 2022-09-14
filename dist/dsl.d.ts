declare interface __emptyClassWorkaround {}
declare type EmptyWorkaround<T> = T | __emptyClassWorkaround;
declare type ValueOrArray<T> = T | ValueOrArray<T>[];
import {EventEmitter} from "events";
import {Transaction} from "better-sqlite3";

declare class Build extends EventEmitter {
    #private;
    readonly graph: Graph;
    readonly db: Db;
    readonly artifactManager: ArtifactManager;
    index: Build.Index;
    constructor(graph: Graph, db: Db, artifactManager: ArtifactManager);
    getJobFor(dependency: Dependency, require?: boolean): Promise<Job | null>;
    getJobSetFor(dependency: Dependency, require?: boolean): Promise<(JobSet | null)>;
    getJobForArtifact(artifact: Artifact, require?: boolean): Promise<Job | null>;
    getJobSetForArtifact(artifact: Artifact, require?: boolean): Promise<(JobSet | null)>;
    getJobForRuleKey(ruleKey: string | null): Job | null;
    getJobSetForRuleKey(ruleKey: string | null): JobSet | null;
    getAlsoJobSetForRuleKey(ruleKey: string | null): JobSet | null;
    getRuleKeyForArtifact(artifact: Artifact, version?: string): Promise<(string | null)>;
    requireRuleKeyForArtifact(artifact: Artifact, version?: string): Promise<string>;
    getRecordedVersionInfo: (output: Artifact) => Promise<Build.RecordedVersionInfo>;
    recordVersionInfo(job: Job, dependencies: Dependency[], outputs: Artifact[]): Promise<void>;
    createRecordVersionInfoTransaction(outputInfos: {
        output: Artifact;
        version: string;
    }[], depInfos: {
        dependency: Dependency;
        version: string;
    }[], job: Job): Transaction;
    recordStandardVersionInfo(job: Job): Promise<void>;
    recordArtifacts(artifacts: Artifact[]): void;
    getActualVersionInfo(artifacts: Artifact[]): Promise<Record<string, string | null>>;
    isUpToDate(job: Job): Promise<boolean>;
    cleanOutputs(job: Job): Promise<void>;
    getArtifactReliances(artifactKey: string): Record<string, Record<string, Rule>>;
    recordReliance(rule: Rule, artifact: Artifact): Promise<void>;
    getVersionReliedOn(rule: Rule, artifact: Artifact, required: boolean): string | undefined;
    formatRelianceConflictMessage(relianceInfo: Build.ArtifactRelianceInfo, artifact: Artifact, version: string, rule: Rule): string;
    requireJobForRuleKey(ruleKey: string): Job;
}

declare class Db {
    #private;
    dbFilePath: string;
    queryCount: number;
    queryTime: number;
    constructor(dbFilePath: string);
    get db(): Database;
    get stmt(): Statements;
    has(targetId: string): boolean;
    hasVersion(targetId: string, version: string): boolean;
    listVersions(targetId: string): VersionRecord[];
    listVersionSources(targetId: string, version: string): VersionSourcesRecord[];
    record(targetId: string, targetVersion: string, ruleKey: string, sourceId: string, sourceVersion: string): any;
    retract(targetId: string, targetVersion: string): any;
    retractTarget(targetId: string): any;
    retractRule(ruleKey: string): any;
    listRuleSources(ruleKey: string): RuleSourcesRecord[];
    listRuleTargets(ruleKey: string): RuleTargetsRecord[];
    /**
     *
     * @param {string} target
     * @param {string} version
     * @return {Promise<string|null>}
     */
    getProducingRule(target: string, version: string): string | null;
    recordArtifact(key: string, type: string, identity: string): any;
    getArtifact(key: string): ArtifactRecord;
    pruneArtifacts(): void;
    close(): Promise<void>;
    query(verb: StatementVerb, statementKey: StatementKey, data: object): any;
    get(statementKey: StatementKey, data: object): any;
    run(statementKey: StatementKey, data: object): any;
    all(statementKey: StatementKey, data: object): any;
}

declare class Graph {
    protected rule_seq: number;
    index: GraphIndex;
    constructor();
    addRule(rule: Rule): void;
    indexRule(rule: Rule): void;
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

declare class JobSet {
    #private;
    constructor(...jobs: Job[]);
    run(): Promise<void[]>;
    private createRunPromise;
    private add;
    union(jobSet?: JobSet | null): JobSet;
    difference(jobSet?: JobSet | null): JobSet | null | undefined;
    get jobs(): Job[];
    get job(): Job | undefined;
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

declare class ZrupAPI {
    Artifact: typeof Artifact;
    AID: typeof AID;
    FileArtifact: typeof FileArtifact;
    RecipeArtifact: typeof RecipeArtifact;
    MockArtifact: typeof MockArtifact;
    Dependency: typeof Dependency;
    ArtifactManager: typeof ArtifactManager;
    ArtifactFactory: typeof ArtifactFactory;
    FileArtifactFactory: typeof FileArtifactFactory;
    FileArtifactResolver: typeof FileArtifactResolver;
    RecipeArtifactFactory: typeof RecipeArtifactFactory;
    RecipeArtifactResolver: typeof RecipeArtifactResolver;
    MockFileFactory: typeof MockFileFactory;
    Db: typeof Db;
    Build: typeof Build;
    Job: typeof Job;
    JobSet: typeof JobSet;
    Rule: typeof Rule;
    Recipe: typeof Recipe;
    NopRecipe: typeof NopRecipe;
    CommandRecipe: typeof CommandRecipe;
    WrapperRecipe: typeof WrapperRecipe;
    DelayedRecipe: typeof DelayedRecipe;
    ModuleBuilder: typeof ModuleBuilder;
    RuleBuilder: typeof RuleBuilder;
    Zrup: typeof Zrup;
    resolveArtifacts: typeof resolveArtifacts;
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

declare class Dependency {
    #private;
    constructor(artifact: Artifact, whenAbsent: Dependency.Absent);
    get artifact(): Artifact;
    get whenAbsent(): Dependency.Absent;
    static readonly ABSENT_VIOLATION = 0;
    static readonly ABSENT_STATE = 1;
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
    static redeemDescriptorProvider(R: RuleBuilder.DefinerAPI, provider: CommandRecipe.simpleDescriptorBuilder | string): CommandRecipe.SimpleDescriptor;
    private static normalizeDescriptor;
    static fromSimpleDescriptor(module: Module, descriptor: CommandRecipe.SimpleDescriptor): CommandRecipe;
    private static validateCommandDescriptorSchema;
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

declare class RecipeArtifact extends Artifact {
    #private;
    readonly job: Job;
    rm(): Promise<void>;
    constructor(aid: Artifact.Reference, job: Job);
    get exists(): Promise<boolean>;
    get spec(): Promise<Object>;
    get version(): Promise<string>;
    static makeFor(job: Job): RecipeArtifact;
}

declare global {
    namespace Build  {
        interface RecordedVersionInfo {
            target: string;
            version: string | null;
            sourceVersions: Record<string, string>;
        }
        interface Index {
            rule: {
                job: Map<string, Job>;
                jobSet: Map<string, JobSet>;
            };
        }
        type RuleIndex = Record<string, Rule>;
        type ArtifactRelianceInfo = Record<string, RuleIndex>;
    }
    
    namespace ModuleBuilder  {
        type definerAcceptor = (nameOrDefiner: string | definer, definerOpt?: definer | undefined) => any;
        /**
         * A function that defines a module.
         * @param {DefinerAPI} params Parameter object that provides necessary APIs for defining a module.
         */
        type definer = (params: DefinerAPI) => any;
        /**
         * An API object for defining modules. It is passed to a user-supplied {@link ModuleBuilder.definer definer}
         * callback that is default-exported from a javascript module file read by the framework.
         * @property {Module} module The module being defined
         * @property {ModuleBuilder.includeNominator} include Include other modules by referring to directories containing them, relative to this module's directory.
         * This is how you recursively include all your project's modules from the root module. There is no automatic
         * scanning for `.zrup.mjs` files in subdirectories.
         * @property {RuleBuilder.definerAcceptor} rule Define a rule by providing a {@link RuleBuilder.definer} callback. Most of the time you will use the
         * simplified {@link to to()} API instead of this one.
         * @property {RuleBuilder.artifactNominator} depends Resolve {@link Artifact.Resolvable artifact-resolvables} to {@link Dependency} instances and designate them
         * as dependencies for the rule being defined.
         *
         * This function can **only** be used in a {@link RuleBuilder.definer rule definer}, but it
         * is available in a module definer API object for convenience, so it can be destructured once per module.
         * @property {RuleBuilder.artifactNominator} produces Resolve {@link Artifact.Resolvable artifact-resolvables} to {@link Artifact} instances and designate them
         * as outputs of the rule being defined.
         *
         * This function can **only** be used in a {@link RuleBuilder.definer rule definer}, but it
         * is available in a module definer API object for convenience, so it can be destructured once per module.
         * @property {RuleBuilder.ruleNominator} after Specifies rules after which this rule must be processed. It is a way to create dependency edges between
         * rules themselves, rather than between artifacts. It is sometimes necessary when we want to depend on another
         * rule's autotargets but we can't enumerate those in advance.
         *
         * This function can **only** be used in a {@link RuleBuilder.definer rule definer}, but it
         * is available in a module definer API object for convenience, so it can be destructured once per module.
         * @property {CommandRecipe.simpleDescriptorBuilderAcceptor} to Simplified API to define a rule with a specification object rather than by calling
         * {@link ModuleBuilder.DefinerAPI} APIs imperatively. You will use this
         * one instead of {@link ModuleBuilder.DefinerAPI.rule rule()} most of the time.
         * @property {RuleBuilder.flagSetter} always Mark the rule currently being defined as an always-rule. This replaces the normal up-to-date check for the
         * rule's outputs with `false`. As a result, the rule's recipe is always invoked if any of its outputs is
         * required to build the requested goal.
         * @property {RuleBuilder.ruleNominator} also Specify also-rules for the rule being defined. It specifies that when this rule is required, then (an)other
         * rule(s) are automatically also required, but it does not specify relative order of processing. The order
         * is dictated by regular dependencies which may force the other rules to be processed before or after the
         * current rule, or allow them to be processed in parallel.
         *
         * This function can **only** be used in a {@link RuleBuilder.definer rule definer}, but it
         * is available in a module definer API object for convenience, so it can be destructured once per module.
         * @property {ModuleBuilder.resolve} resolve Resolve {@link Artifact.Resolvable artifact-resolvables} to {@link Artifact} instances without designating
         * them as either dependencies or targets.
         * @property {ZrupAPI} API An object containing constructors of all Zrup classes. Use these to implement advanced functionality.
         */
        interface DefinerAPI {
            /**
             * The module being defined
             */
            module: Module;
            /**
             * Include other modules by referring to directories containing them, relative to this module's directory.
             * This is how you recursively include all your project's modules from the root module. There is no automatic
             * scanning for `.zrup.mjs` files in subdirectories.
             */
            include: includeNominator;
            /**
             * Define a rule by providing a {@link RuleBuilder.definer} callback. Most of the time you will use the
             * simplified {@link to to()} API instead of this one.
             */
            rule: RuleBuilder.definerAcceptor;
            /**
             * Resolve {@link Artifact.Resolvable artifact-resolvables} to {@link Dependency} instances and designate them
             * as dependencies for the rule being defined.
             *
             * This function can **only** be used in a {@link RuleBuilder.definer rule definer}, but it
             * is available in a module definer API object for convenience, so it can be destructured once per module.
             */
            depends: RuleBuilder.artifactNominator;
            /**
             * Resolve {@link Artifact.Resolvable artifact-resolvables} to {@link Artifact} instances and designate them
             * as outputs of the rule being defined.
             *
             * This function can **only** be used in a {@link RuleBuilder.definer rule definer}, but it
             * is available in a module definer API object for convenience, so it can be destructured once per module.
             */
            produces: RuleBuilder.artifactNominator;
            /**
             * Specifies rules after which this rule must be processed. It is a way to create dependency edges between
             * rules themselves, rather than between artifacts. It is sometimes necessary when we want to depend on another
             * rule's autotargets but we can't enumerate those in advance.
             *
             * This function can **only** be used in a {@link RuleBuilder.definer rule definer}, but it
             * is available in a module definer API object for convenience, so it can be destructured once per module.
             */
            after: RuleBuilder.ruleNominator;
            /**
             * Simplified API to define a rule with a specification object rather than by calling
             * {@link ModuleBuilder.DefinerAPI} APIs imperatively. You will use this
             * one instead of {@link ModuleBuilder.DefinerAPI.rule rule()} most of the time.
             */
            to: CommandRecipe.simpleDescriptorBuilderAcceptor;
            /**
             * Mark the rule currently being defined as an always-rule. This replaces the normal up-to-date check for the
             * rule's outputs with `false`. As a result, the rule's recipe is always invoked if any of its outputs is
             * required to build the requested goal.
             */
            always: RuleBuilder.flagSetter;
            /**
             * Specify also-rules for the rule being defined. It specifies that when this rule is required, then (an)other
             * rule(s) are automatically also required, but it does not specify relative order of processing. The order
             * is dictated by regular dependencies which may force the other rules to be processed before or after the
             * current rule, or allow them to be processed in parallel.
             *
             * This function can **only** be used in a {@link RuleBuilder.definer rule definer}, but it
             * is available in a module definer API object for convenience, so it can be destructured once per module.
             */
            also: RuleBuilder.ruleNominator;
            /**
             * Resolve {@link Artifact.Resolvable artifact-resolvables} to {@link Artifact} instances without designating
             * them as either dependencies or targets.
             */
            resolve: ModuleBuilder.resolve;
            /**
             * An object containing constructors of all Zrup classes. Use these to implement advanced functionality.
             */
            API: ZrupAPI;
        }
        type resolve = (items: Artifact.Resolvables) => (string | ResolveArtifactResult)[];
        /**
         * A function that takes a list of relative module paths referring to modules that should be included.
         * @param {...string} includes Module paths
         */
        type includeNominator = (...includes: string[]) => Promise<string[]>;
        /**
         * An internal module descriptor created for each module file as it is loaded, but before
         * executing the {@link ModuleBuilder.definer definer} exported by it.
         * @property {string} name Module name. Defaults to the `name` property of the {@link ModuleBuilder.definer definer} function
         * default-exported by the module.
         * @property {ModuleBuilder.definer} definer The {@link ModuleBuilder.definer definer} function.
         */
        interface Descriptor {
            /**
             * Module name. Defaults to the `name` property of the {@link ModuleBuilder.definer definer} function
             * default-exported by the module.
             */
            name: string;
            /**
             * The {@link ModuleBuilder.definer definer} function.
             */
            definer: definer;
        }
    }
    
    namespace RuleBuilder  {
        /**
         * Type of function that accepts a {@link RuleBuilder.definer rule definer} callback and presumably uses it to
         * define a rule. We need this type alias to type the {@link RuleBuilder.DefinerAPI.rule rule} property of the
         * {@link RuleBuilder.DefinerAPI} interface.
         */
        type definerAcceptor = (nameOrDefiner: string | definer, definerOpt?: definer) => any;
        /**
         * Type of user-supplied function whose job is to define a rule using an
         * {@link RuleBuilder.DefinerAPI DefinerAPI} object passed to it.
         */
        type definer = (api: DefinerAPI) => Recipe;
        /**
         * API object for defining rules. It is passed to user-supplied {@link RuleBuilder.definer definer callbacks}.
         * @property {Rule} rule The {@link Rule} instance being defined.
         * @property {RuleBuilder.artifactNominator} depends {@see ModuleBuilder.DefinerAPI.depends}
         * @property {RuleBuilder.artifactNominator} produces {@see ModuleBuilder.DefinerAPI.produces}
         * @property {RuleBuilder.ruleNominator} after {@see ModuleBuilder.DefinerAPI.after}
         * @property {RuleBuilder.flagSetter} always {@see ModuleBuilder.DefinerAPI.always}
         * @property {ModuleBuilder.resolve} resolve {@see ModuleBuilder.DefinerAPI.resolve}
         */
        interface DefinerAPI {
            /** The {@link Rule} instance being defined. */
            rule: Rule;
            /** {@see ModuleBuilder.DefinerAPI.depends}*/
            depends: RuleBuilder.artifactNominator;
            /** {@see ModuleBuilder.DefinerAPI.produces}*/
            produces: RuleBuilder.artifactNominator;
            /** {@see ModuleBuilder.DefinerAPI.after}*/
            after: RuleBuilder.ruleNominator;
            /** {@see ModuleBuilder.DefinerAPI.always}*/
            always: RuleBuilder.flagSetter;
            /** {@see ModuleBuilder.DefinerAPI.resolve}*/
            resolve: ModuleBuilder.resolve;
            T: templateStringTag;
        }
        /**
         * A function type that receives {@see Artifact.Resolvable artifact-resolvables} and presumably designates the
         * corresponding artifacts as relevant to the rule being built, i.e. as dependencies or outputs.
         */
        type artifactNominator = (...resolvables: Artifact.Resolvables[]) => any;
        /**
         * A function type that receives rule names and presumably designates the corresponding rules as relevant to
         * the rule being built, i.e. as its after-rules or also-rules.
         */
        type ruleNominator = (...ruleRefs: string[]) => any;
        /**
         * A function type for setting a boolean option on a rule being defined.
         */
        type flagSetter = (value?: boolean) => any;
        /**
         * A function type that internally represents a {@link RuleBuilder.definer rule definer} callback with the
         * `api` parameter pre-bound.
         */
        type boundDefiner = (...args: any[]) => Recipe;
        /**
         * An object type that internally represents a rule definer associated with a rule object and ready to be invoked.
         * @property {Module} module The module to which the rule being defined belongs.
         * @property {Rule} rule The rule being defined.
         * @property {RuleBuilder.boundDefiner} boundDefiner User-supplied {@link RuleBuilder.definer rule definer} with pre-bound `api` parameter
         */
        interface Declaration {
            /** The module to which the rule being defined belongs. */
            module: Module;
            /** The rule being defined. */
            rule: Rule;
            /** User-supplied {@link RuleBuilder.definer rule definer} with pre-bound `api` parameter */
            boundDefiner: RuleBuilder.boundDefiner;
        }
        /**
         * A type for representing the result of looking up a rule by name or rule {@link AID}
         */
        interface LocateResult {
            rule: Rule | null;
            resolvedRef: string;
        }
    }
    
    namespace Artifact  {
        type Reference = string | AID;
        type ClassConstructor = {
            new (aid: Reference, ...args: any): Artifact;
            type?: string;
        };
        type Caps = {
            canWrite: boolean;
            canRemove: boolean;
            canBuild: boolean;
        };
        type References = ValueOrArray<EmptyWorkaround<Reference>>;
        type Resolvable = Reference | Artifact | Dependency | ResolveArtifactResult;
        type Resolvables = ValueOrArray<EmptyWorkaround<Resolvable>>;
        type Descriptor = {
            type?: string;
            module?: string;
            ref: string;
        };
    }
    
    namespace Dependency  {
        enum Absent {
            Violation = 0,
            State = 1
        }
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
        type simpleDescriptorBuilder = builder<RuleBuilder.DefinerAPI, SimpleDescriptor | string>;
        type simpleDescriptorBuilderAcceptor = (ruleName: string, descriptorProvider: simpleDescriptorBuilder | string) => any | string;
    }
}

export{};
