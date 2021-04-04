import {Module} from "./module";
import fsPath from "path";
import {Graph} from "./graph";

interface ProjectIndex {
    module : {
        name: Record<string, Module>,
        path: Record<string, Module>
    }
}

export class Project
{
    #index : ProjectIndex = {
        module: {
            name: {},
            path: {}
        }
    }

    readonly #rootDirectory : string;

    readonly #graph : Graph;

    #rootModule : Module|null;

    constructor(rootDirectory : string)
    {
        this.#rootDirectory=rootDirectory;
        this.#graph = new Graph();
        this.#rootModule = null;
    }

    /** @return {Graph} */
    get graph()
    {
        return this.#graph;
    }

    addModule(module : Module) : Module
    {
        this.#index.module.name[module.name]
            = this.#index.module.path[fsPath.relative(this.path, module.absolutePath)]
            = module;
        if (!this.#rootModule && !module.parent) this.#rootModule = module;
        return module;
    }

    getModuleByName(name : string, require?: boolean) : Module|null
    {
        const result = this.#index.module.name[name];
        if (!result && require) {
            throw new Error(`Unknown module ${name}`);
        }
        return result || null;
    }

    requireModuleByName(name : string) : Module
    {
        return this.getModuleByName(name, true) as Module;
    }

    get allModules() : Module[]
    {
        return Object.values(this.#index.module.name);
    }

    getModuleByPath(path : string) : Module|null
    {
        return this.#index.module.path[path] || null;
    }

    get rootModule() : Module|null
    {
        return this.#rootModule;
    }

    get path() : string
    {
        return this.#rootDirectory;
    }
}