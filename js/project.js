var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Project_index, _Project_rootDirectory, _Project_graph, _Project_rootModule;
import fsPath from "path";
import { Graph } from "./graph.js";
export class Project {
    constructor(rootDirectory) {
        _Project_index.set(this, {
            module: {
                name: {},
                path: {}
            }
        });
        _Project_rootDirectory.set(this, void 0);
        _Project_graph.set(this, void 0);
        _Project_rootModule.set(this, void 0);
        __classPrivateFieldSet(this, _Project_rootDirectory, rootDirectory, "f");
        __classPrivateFieldSet(this, _Project_graph, new Graph(), "f");
        __classPrivateFieldSet(this, _Project_rootModule, null, "f");
    }
    /** @return {Graph} */
    get graph() {
        return __classPrivateFieldGet(this, _Project_graph, "f");
    }
    addModule(module) {
        __classPrivateFieldGet(this, _Project_index, "f").module.name[module.name]
            = __classPrivateFieldGet(this, _Project_index, "f").module.path[fsPath.relative(this.path, module.absolutePath)]
                = module;
        if (!__classPrivateFieldGet(this, _Project_rootModule, "f") && !module.parent)
            __classPrivateFieldSet(this, _Project_rootModule, module, "f");
        return module;
    }
    getModuleByName(name, require) {
        const result = __classPrivateFieldGet(this, _Project_index, "f").module.name[name];
        if (!result && require) {
            throw new Error(`Unknown module ${name}`);
        }
        return result || null;
    }
    requireModuleByName(name) {
        return this.getModuleByName(name, true);
    }
    get allModules() {
        return Object.values(__classPrivateFieldGet(this, _Project_index, "f").module.name);
    }
    getModuleByPath(path) {
        return __classPrivateFieldGet(this, _Project_index, "f").module.path[path] || null;
    }
    get rootModule() {
        return __classPrivateFieldGet(this, _Project_rootModule, "f");
    }
    get path() {
        return __classPrivateFieldGet(this, _Project_rootDirectory, "f");
    }
}
_Project_index = new WeakMap(), _Project_rootDirectory = new WeakMap(), _Project_graph = new WeakMap(), _Project_rootModule = new WeakMap();
//# sourceMappingURL=project.js.map