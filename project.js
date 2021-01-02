import {Module} from "./module";
import fsPath from "path";
import {Graph} from "./graph";

/**
 * @callback
 */
export class Project
{
    #index = {
        module: {
            name: {},
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
            = this.#index.module.path[fsPath.relative(this.path, module.resolve(""))]
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

    /**
     * @param {string} path
     * @return {Module|null}
     */
    getModuleByPath(path)
    {
        return this.#index.module.path[path] || null;
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

    /**
     * @param {string} path
     * @return {Module|null}
     */
    findClosestModule(path)
    {
        //TODO: maintain a tree of modules and use it to optimize this
        let prefix = "";
        let result = null;
        let index = this.#index.module.name
        for(let moduleName in index) {
            /** @type {Module} */
            let module = index[moduleName];
            const modulePath = module.absolutePath;
            if (
                path.startsWith(modulePath)
                && (
                    path.length <= modulePath.length
                    || path.charAt(modulePath.length) === "/"
                )
            ) {
                prefix = modulePath;
                result = module;
            }
        }
        return result;
    }
}