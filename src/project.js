var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _index, _rootDirectory, _graph, _rootModule;
import fsPath from "path";
import { Graph } from "./graph.js";
export class Project {
    constructor(rootDirectory) {
        _index.set(this, {
            module: {
                name: {},
                path: {}
            }
        });
        _rootDirectory.set(this, void 0);
        _graph.set(this, void 0);
        _rootModule.set(this, void 0);
        __classPrivateFieldSet(this, _rootDirectory, rootDirectory);
        __classPrivateFieldSet(this, _graph, new Graph());
        __classPrivateFieldSet(this, _rootModule, null);
    }
    /** @return {Graph} */
    get graph() {
        return __classPrivateFieldGet(this, _graph);
    }
    addModule(module) {
        __classPrivateFieldGet(this, _index).module.name[module.name]
            = __classPrivateFieldGet(this, _index).module.path[fsPath.relative(this.path, module.absolutePath)]
                = module;
        if (!__classPrivateFieldGet(this, _rootModule) && !module.parent)
            __classPrivateFieldSet(this, _rootModule, module);
        return module;
    }
    getModuleByName(name, require) {
        const result = __classPrivateFieldGet(this, _index).module.name[name];
        if (!result && require) {
            throw new Error(`Unknown module ${name}`);
        }
        return result || null;
    }
    requireModuleByName(name) {
        return this.getModuleByName(name, true);
    }
    get allModules() {
        return Object.values(__classPrivateFieldGet(this, _index).module.name);
    }
    getModuleByPath(path) {
        return __classPrivateFieldGet(this, _index).module.path[path] || null;
    }
    get rootModule() {
        return __classPrivateFieldGet(this, _rootModule);
    }
    get path() {
        return __classPrivateFieldGet(this, _rootDirectory);
    }
}
_index = new WeakMap(), _rootDirectory = new WeakMap(), _graph = new WeakMap(), _rootModule = new WeakMap();
//# sourceMappingURL=project.js.map