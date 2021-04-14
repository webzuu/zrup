import {RuleBuilder} from "./rule-builder.js";
import {Artifact} from "../graph/artifact.js";
import fs from "fs";
import {CommandRecipe} from "../build/recipe/command.js";
import {Module, ResolveArtifactResult, resolveArtifacts} from "../module.js";
import * as path from "path";
import {ZrupAPI} from "./zrup.js";
import EventEmitter from "events";
import {Project} from "../project.js";
import simpleDescriptorBuilderAcceptor = CommandRecipe.simpleDescriptorBuilderAcceptor;

/**
 *
 */
export namespace ModuleBuilder {
    export type definerAcceptor = (nameOrDefiner: string|definer, definerOpt?: definer|undefined) => any;
    export type definer = (params: DefinerParams) => any;
    export type DefinerParams = {
        module: Module,
        include: includeNominator,
        rule: RuleBuilder.definerAcceptor,
        depends: RuleBuilder.artifactNominator,
        produces: RuleBuilder.artifactNominator,
        after: RuleBuilder.ruleNominator,
        to: CommandRecipe.simpleDescriptorBuilderAcceptor,
        always: RuleBuilder.flagSetter,
        also: RuleBuilder.ruleNominator,
        resolve: ModuleBuilder.resolve,
        API: ZrupAPI
    }
    export type resolve = (items: Artifact.Resolvables) => (string|ResolveArtifactResult)[];
    export type includeNominator = (...includes: string[]) => Promise<string[]>;
    export type Descriptor = {
        name: string,
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

    private bindDefinerArgs(module: Module): ModuleBuilder.DefinerParams {
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