import fsPath from "path";
import { Graph } from "./graph.js";
export class Project {
    constructor(rootDirectory) {
        this.$index = {
            module: {
                name: {},
                path: {}
            }
        };
        this.$rootDirectory = rootDirectory;
        this.$graph = new Graph();
        this.$rootModule = null;
    }
    get graph() {
        return this.$graph;
    }
    addModule(module) {
        this.$index.module.name[module.name]
            = this.$index.module.path[fsPath.relative(this.path, module.absolutePath)]
                = module;
        if (!this.$rootModule && !module.parent)
            this.$rootModule = module;
        return module;
    }
    getModuleByName(name, require) {
        const result = this.$index.module.name[name];
        if (!result && require) {
            throw new Error(`Unknown module ${name}`);
        }
        return result || null;
    }
    requireModuleByName(name) {
        return this.getModuleByName(name, true);
    }
    get allModules() {
        return Object.values(this.$index.module.name);
    }
    getModuleByPath(path) {
        return this.$index.module.path[path] || null;
    }
    get rootModule() {
        return this.$rootModule;
    }
    get path() {
        return this.$rootDirectory;
    }
}
//# sourceMappingURL=project.js.map