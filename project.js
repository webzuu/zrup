import {Module} from "./module.js";
import fsPath from "path";
import {Graph} from "./graph.js";

/**
 * @callback
 */
export class Project
{
    #index = {
        module: {
            /** @type {Object.<string, Module>} */
            name: {},
            /** @type {Object.<string, Module>} */
            path: {}
        }
    }

    /** @type {string} */
    #rootDirectory;

    /** @type {Graph} */
    #graph;

    /** @type {Module|null} */
    #rootModule;

    /** @param {string} rootDirectory */
    constructor(rootDirectory)
    {
        this.#rootDirectory=rootDirectory;
        this.#graph = new Graph();
    }

    get graph()
    {
        return this.#graph;
    }

    /**
     * @param {Module} module
     */
    addModule(module)
    {
        this.#index.module.name[module.name]
            = this.#index.module.path[fsPath.relative(this.path, module.absolutePath)]
            = module;
        if (!this.#rootModule && !module.parent) this.#rootModule = module;
        return module;
    }

    /**
     * @param {string} name
     * @param {boolean|undefined} [require]
     * @return {Module|null}
     */
    getModuleByName(name,require)
    {
        return this.#index.module.name[name] || null;
    }

    /** @return {Module[]} */
    get allModules()
    {
        return Object.values(this.#index.module.name);
    }

    /**
     * @param {string} path
     * @return {Module|null}
     */
    getModuleByPath(path)
    {
        return this.#index.module.path[path] || null;
    }

    resetRecipes()
    {
        for (let rule of this.#graph.index.rule.key.values()) if (rule.recipe) rule.recipe.reset();
    }

    /** @return {Module|null} */
    get rootModule()
    {
        return this.#rootModule;
    }

    /** @return {string} */
    get path()
    {
        return this.#rootDirectory;
    }
}