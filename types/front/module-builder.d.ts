/// <reference types="node" />
import { RuleBuilder } from "./rule-builder.js";
import { Artifact } from "../graph/artifact.js";
import { CommandRecipe } from "../build/recipe/command.js";
import { Module, ResolveArtifactResult } from "../module.js";
import { ZrupAPI } from "./zrup.js";
import EventEmitter from "events";
import { Project } from "../project.js";
/**
 *
 */
export declare namespace ModuleBuilder {
    type definerAcceptor = (nameOrDefiner: string | definer, definerOpt?: definer | undefined) => any;
    /**
     * A function that defines a module.
     * @param {DefinerAPI} params Parameter object that provides necessary APIs for defining a module.
     */
    type definer = (params: DefinerAPI) => any;
    /**
     * An API object for defining modules. It is passed to a user-supplied {@link ModuleBuilder.definer definer}
     * callback that is default-exported from a javascript module file read by the framework.
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
export declare class ModuleBuilder extends EventEmitter {
    #private;
    constructor(project: Project, ruleBuilder: RuleBuilder);
    get project(): Project;
    define(parentModule: Module | null, path: string, name: string, definer: ModuleBuilder.definer): Promise<void>;
    private bindDefinerArgs;
    includeMany(parentModule: Module, ...subpaths: string[]): Promise<string[]>;
    loadModule(parentModule: Module, subpath: string): Promise<string>;
    loadRootModule(): Promise<void>;
    private static normalizeDefiner;
    private static describeDefiner;
    private import;
    private getSpecFileBasename;
    private resolveModuleBase;
}
//# sourceMappingURL=module-builder.d.ts.map