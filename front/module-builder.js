/**
 * @callback ModuleBuilder~definerAcceptor
 * @param {string|ModuleBuilder~definer} nameOrDefiner
 * @param {ModuleBuilder~definer|undefined} [definerOpt]
 */

/**
 * @callback ModuleBuilder~definer
 * @param {ModuleBuilder~DefinerParams} params
 */

/**
 * @typedef {Object} ModuleBuilder~DefinerParams
 * @property {Module} module
 * @property {ModuleBuilder~includeNominator} include
 * @property {RuleBuilder~definerAcceptor} rule
 */

import {Module} from "../module";
import {promises as fsp} from "fs";
import * as path from "path";

/**
 * @callback ModuleBuilder~includeNominator
 * @param {...string} includes
 * @return {Promise<void>}
 */

/**
 * @typedef {Object} ModuleBuilder~Descriptor
 * @property {string} name
 * @property {ModuleBuilder~definer} definer
 */

export class ModuleBuilder
{
    /** @type {Project} */
    #project;
    /** @type {RuleBuilder} */
    #ruleBuilder;

    /**
     * @param {Project} project
     * @param {RuleBuilder} ruleBuilder
     */
    constructor(project, ruleBuilder)
    {
        this.#project = project;
        this.#ruleBuilder = ruleBuilder;
    }

    get project() {
        return this.#project;
    }

    /**
     * @param {Module|null} parentModule
     * @param {string} path
     * @param {string} name
     * @param {ModuleBuilder~definer} definer
     */
    async define(parentModule, path, name, definer)
    {
        const moduleToBeDefined = (
            parentModule
                ? this.#project.addModule(new Module(parentModule, path, name))
                : Module.createRoot(this.#project, name)
        );
        definer(this.#bindDefinerArgs(moduleToBeDefined));
    }

    /**
     * @param {Module} module
     * @return {ModuleBuilder~DefinerParams}
     */
    #bindDefinerArgs(module)
    {
        return {
            module,
            include: this.includeMany.bind(this, module),
            rule: this.#ruleBuilder.bindDefinerAcceptor(module)
        };
    }

    /**
     *
     * @param {Module} parentModule
     * @param {...string} subpaths
     * @return {Promise<void>}
     */
    async includeMany(parentModule, ...subpaths)
    {
        await Promise.all(subpaths.map(this.loadModule.bind(this,parentModule)));
    }

    /**
     * @param {Module} parentModule
     * @param {string} subpath
     * @return {Promise<void>}
     */
    async loadModule(parentModule, subpath)
    {
        const definer = ModuleBuilder.#normalizeDefiner(await this.#import(this.#resolveModuleBase(parentModule, subpath)));
        await this.define(parentModule, definer.name, subpath, definer.definer);
    }

    async loadRootModule()
    {
        const definer = ModuleBuilder.#normalizeDefiner(await this.#import(this.#project.path));
        await this.define(null, definer.name, this.#project.path, definer.definer);
    }

    /**
     * @param {ModuleBuilder~definer|ModuleBuilder~Descriptor} definerOrDescriptor
     * @return {ModuleBuilder~Descriptor}
     */
    static #normalizeDefiner(definerOrDescriptor)
    {
        return (
            "function"===typeof definerOrDescriptor
                ? ModuleBuilder.#describeDefiner(definerOrDescriptor)
                : definerOrDescriptor
        );
    }

    /**
     * @param {ModuleBuilder~definer} definer
     * @return {ModuleBuilder~Descriptor}
     */
    static #describeDefiner(definer)
    {
        return {
            name: definer.name,
            definer
        };
    }

    /**
     * @param {string} containingDir
     * @return {Promise<ModuleBuilder~definer|ModuleBuilder~Descriptor>}
     */
    async #import(containingDir)
    {
        const base = path.join(containingDir, this.#getSpecFileBasename());
        for(let ext of ["mjs","cjs","js"]) {
            const candidate = `${base}.${ext}`;
            if (await fsp.exists(candidate)) return (await import(candidate)).default;
        }
        throw new Error(`No zrup module definition file found in ${containingDir}`);
    }

    // noinspection JSMethodCanBeStatic
    #getSpecFileBasename()
    {
        return ".zrup"; //TODO: make configurable
    }
}