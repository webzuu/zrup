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
 * @typedef {Object.<string,*>} ModuleBuilder~DefinerParams
 * @property {Module} module
 * @property {ModuleBuilder~includeNominator} include
 * @property {RuleBuilder~definerAcceptor} rule
 */

import {Module} from "../module.js";
import fs, {promises as fsp} from "fs";
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

import EventEmitter from "events";

export class ModuleBuilder extends EventEmitter
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
        super();
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
        this.emit('defining.module',moduleToBeDefined,path,name);
        definer(this.#bindDefinerArgs(moduleToBeDefined));
        this.emit('defined.module',moduleToBeDefined,path,name);
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
        await this.define(null, this.#project.path, definer.name, definer.definer);
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
        let importedModule = null;
        this.emit('loading.module',base);
        for(let ext of ["mjs","cjs","js"]) {
            try {
                const fullPath = `${base}.${ext}`;
                importedModule = (await import(fullPath)).default;
                this.emit('loaded.module', fullPath);
                return importedModule;
            }
            catch(e) {
                if ("ERR_MODULE_NOT_FOUND" !== e.code) {
                    throw e;
                }
            }
        }
        throw new Error(`No zrup module definition file found in ${containingDir}`);
    }

    // noinspection JSMethodCanBeStatic
    #getSpecFileBasename()
    {
        return ".zrup"; //TODO: make configurable
    }

    /**
     * @param {Module} parentModule
     * @param {string} subpathSegments
     * @return {string}
     */
    #resolveModuleBase(parentModule,...subpathSegments)
    {
        return module.resolve(path.join(...subpathSegments, this.#getSpecFileBasename()));
    }
}