import {RuleBuilder} from "./rule-builder.js";
import {Artifact} from "../graph/artifact.js";
import fs from "fs";
import {CommandRecipe} from "../build/recipe/command.js";
import {Module, ResolveArtifactResult, resolveArtifacts} from "../module.js";
import * as path from "path";
import EventEmitter from "events";
import {Project} from "../project.js";
import simpleDescriptorBuilderAcceptor = CommandRecipe.simpleDescriptorBuilderAcceptor;
import {ZrupAPI} from "./api.js";

/**
 *
 */
export namespace ModuleBuilder {
    export type definerAcceptor = (nameOrDefiner: string|definer, definerOpt?: definer|undefined) => any;

    /**
     * A function that defines a module.
     * @param {DefinerAPI} params Parameter object that provides necessary APIs for defining a module.
     */
    export type definer = (params: DefinerAPI) => any;

    /**
     * An API object for defining modules. It is passed to a user-supplied {@link ModuleBuilder.definer definer}
     * callback that is default-exported from a javascript module file read by the framework.
     */
    export interface DefinerAPI
    {
        /**
         * The module being defined
         */
        module: Module,
        /**
         * Include other modules by referring to directories containing them, relative to this module's directory.
         * This is how you recursively include all your project's modules from the root module. There is no automatic
         * scanning for `.zrup.mjs` files in subdirectories.
         */
        include: includeNominator,
        /**
         * Define a rule by providing a {@link RuleBuilder.definer} callback. Most of the time you will use the
         * simplified {@link to to()} API instead of this one.
         */
        rule: RuleBuilder.definerAcceptor,
        /**
         * Resolve {@link Artifact.Resolvable artifact-resolvables} to {@link Dependency} instances and designate them
         * as dependencies for the rule being defined.
         *
         * This function can **only** be used in a {@link RuleBuilder.definer rule definer}, but it
         * is available in a module definer API object for convenience, so it can be destructured once per module.
         */
        depends: RuleBuilder.artifactNominator,
        /**
         * Resolve {@link Artifact.Resolvable artifact-resolvables} to {@link Artifact} instances and designate them
         * as outputs of the rule being defined.
         *
         * This function can **only** be used in a {@link RuleBuilder.definer rule definer}, but it
         * is available in a module definer API object for convenience, so it can be destructured once per module.
         */
        produces: RuleBuilder.artifactNominator,
        /**
         * Specifies rules after which this rule must be processed. It is a way to create dependency edges between
         * rules themselves, rather than between artifacts. It is sometimes necessary when we want to depend on another
         * rule's autotargets but we can't enumerate those in advance.
         *
         * This function can **only** be used in a {@link RuleBuilder.definer rule definer}, but it
         * is available in a module definer API object for convenience, so it can be destructured once per module.
         */
        after: RuleBuilder.ruleNominator,
        /**
         * Simplified API to define a rule with a specification object rather than by calling
         * {@link ModuleBuilder.DefinerAPI} APIs imperatively. You will use this
         * one instead of {@link ModuleBuilder.DefinerAPI.rule rule()} most of the time.
         */
        to: CommandRecipe.simpleDescriptorBuilderAcceptor,
        /**
         * Mark the rule currently being defined as an always-rule. This replaces the normal up-to-date check for the
         * rule's outputs with `false`. As a result, the rule's recipe is always invoked if any of its outputs is
         * required to build the requested goal.
         */
        always: RuleBuilder.flagSetter,
        /**
         * Specify also-rules for the rule being defined. It specifies that when this rule is required, then (an)other
         * rule(s) are automatically also required, but it does not specify relative order of processing. The order
         * is dictated by regular dependencies which may force the other rules to be processed before or after the
         * current rule, or allow them to be processed in parallel.
         *
         * This function can **only** be used in a {@link RuleBuilder.definer rule definer}, but it
         * is available in a module definer API object for convenience, so it can be destructured once per module.
         */
        also: RuleBuilder.ruleNominator,
        /**
         * Resolve {@link Artifact.Resolvable artifact-resolvables} to {@link Artifact} instances without designating
         * them as either dependencies or targets.
         */
        resolve: ModuleBuilder.resolve,
        /**
         * An object containing constructors of all Zrup classes. Use these to implement advanced functionality.
         */
        API: ZrupAPI
    }
    export type resolve = (items: Artifact.Resolvables) => (string|ResolveArtifactResult)[];
    /**
     * A function that takes a list of relative module paths referring to modules that should be included.
     * @param {...string} includes Module paths
     */
    export type includeNominator = (...includes: string[]) => Promise<string[]>;

    /**
     * An internal module descriptor created for each module file as it is loaded, but before
     * executing the {@link ModuleBuilder.definer definer} exported by it.
     */
    export interface Descriptor {
        /**
         * Module name. Defaults to the `name` property of the {@link ModuleBuilder.definer definer} function
         * default-exported by the module.
         */
        name: string,
        /**
         * The {@link ModuleBuilder.definer definer} function.
         */
        definer: definer
    }
}


export class ModuleBuilder extends EventEmitter
{
    readonly #project: Project;
    readonly #ruleBuilder: RuleBuilder;

    constructor(project: Project, ruleBuilder: RuleBuilder)
    {
        super();
        this.#project = project;
        this.#ruleBuilder = ruleBuilder;
    }

    get project() {
        return this.#project;
    }

    async define(parentModule: Module | null, path: string, name: string, definer: ModuleBuilder.definer)
    {
        const moduleToBeDefined = (
            parentModule
                ? this.#project.addModule(new Module(parentModule, path, name))
                : Module.createRoot(this.#project, name)
        );
        this.emit('defining.module',moduleToBeDefined,path,name);
        await definer(this.bindDefinerArgs(moduleToBeDefined));
        this.emit('defined.module',moduleToBeDefined,path,name);
    }

    private bindDefinerArgs(module: Module): ModuleBuilder.DefinerAPI {
        return {
            module,
            include: this.includeMany.bind(this, module),
            rule: this.#ruleBuilder.bindDefinerAcceptor(module),
            depends: this.#ruleBuilder.depends,
            produces: this.#ruleBuilder.produces,
            after: this.#ruleBuilder.after,
            to: CommandRecipe.to.bind(null, this.#ruleBuilder, module) as simpleDescriptorBuilderAcceptor,
            always: this.#ruleBuilder.always,
            resolve: resolveArtifacts.bind(null, this.#ruleBuilder.artifactManager, module, false),
            also: this.#ruleBuilder.also,
            API: new ZrupAPI()
        };
    }

    async includeMany(parentModule: Module, ...subpaths: string[]): Promise<string[]>
    {
        return await Promise.all(subpaths.map(this.loadModule.bind(this,parentModule)));
    }

    async loadModule(parentModule: Module, subpath: string): Promise<string>
    {
        const definer = ModuleBuilder.normalizeDefiner(await this.import(this.resolveModuleBase(parentModule, subpath)));
        await this.define(parentModule, subpath, definer.name, definer.definer);
        return definer.name;
    }

    async loadRootModule()
    {
        const definer = ModuleBuilder.normalizeDefiner(await this.import(this.#project.path));
        await this.define(null, this.#project.path, definer.name, definer.definer);
    }

    private static normalizeDefiner(definerOrDescriptor: ModuleBuilder.definer | ModuleBuilder.Descriptor): ModuleBuilder.Descriptor {
        return (
            "function"===typeof definerOrDescriptor
                ? ModuleBuilder.describeDefiner(definerOrDescriptor)
                : definerOrDescriptor
        );
    }

    private static describeDefiner(definer: ModuleBuilder.definer): ModuleBuilder.Descriptor {
        return {
            name: definer.name,
            definer
        };
    }

    private async import(containingDir: string): Promise<ModuleBuilder.definer | ModuleBuilder.Descriptor> {
        const base = path.join(containingDir, this.getSpecFileBasename());
        let importedModule = null;
        this.emit('loading.module',base);
        for(let ext of ["mjs","cjs","js"]) {
            const fullPath = `${base}.${ext}`;
            try {
                importedModule = (await import(fullPath)).default;
                this.emit('loaded.module', fullPath);
                return importedModule;
            }
            catch(e) {
                if ("ERR_MODULE_NOT_FOUND" !== e.code) throw e;
                let butItExistsBooHoo = false;
                try { butItExistsBooHoo = (await fs.promises.stat(fullPath)).isFile(); } catch(v) {}
                if (butItExistsBooHoo) throw e;
            }
        }
        throw new Error(`No zrup module definition file found in ${containingDir}`);
    }

    // noinspection JSMethodCanBeStatic
    private getSpecFileBasename() {
        return ".zrup"; //TODO: make configurable
    }

    // noinspection JSMethodCanBeStatic
    private resolveModuleBase(parentModule: Module, ...subpathSegments: string[]): string {
        return parentModule.resolve(path.join(...subpathSegments));
    }
}