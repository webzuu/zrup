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
var _project, _ruleBuilder;
import fs from "fs";
/***/
import { CommandRecipe } from "../build/recipe/command.js";
import { Module, resolveArtifacts } from "../module.js";
import * as path from "path";
import { ZrupAPI } from "./zrup.js";
import EventEmitter from "events";
export class ModuleBuilder extends EventEmitter {
    constructor(project, ruleBuilder) {
        super();
        _project.set(this, void 0);
        _ruleBuilder.set(this, void 0);
        __classPrivateFieldSet(this, _project, project);
        __classPrivateFieldSet(this, _ruleBuilder, ruleBuilder);
    }
    get project() {
        return __classPrivateFieldGet(this, _project);
    }
    async define(parentModule, path, name, definer) {
        const moduleToBeDefined = (parentModule
            ? __classPrivateFieldGet(this, _project).addModule(new Module(parentModule, path, name))
            : Module.createRoot(__classPrivateFieldGet(this, _project), name));
        this.emit('defining.module', moduleToBeDefined, path, name);
        await definer(this.bindDefinerArgs(moduleToBeDefined));
        this.emit('defined.module', moduleToBeDefined, path, name);
    }
    bindDefinerArgs(module) {
        return {
            module,
            include: this.includeMany.bind(this, module),
            rule: __classPrivateFieldGet(this, _ruleBuilder).bindDefinerAcceptor(module),
            depends: __classPrivateFieldGet(this, _ruleBuilder).depends,
            produces: __classPrivateFieldGet(this, _ruleBuilder).produces,
            after: __classPrivateFieldGet(this, _ruleBuilder).after,
            to: CommandRecipe.to.bind(null, __classPrivateFieldGet(this, _ruleBuilder), module),
            always: __classPrivateFieldGet(this, _ruleBuilder).always,
            resolve: resolveArtifacts.bind(null, __classPrivateFieldGet(this, _ruleBuilder).artifactManager, module, false),
            also: __classPrivateFieldGet(this, _ruleBuilder).also,
            API: new ZrupAPI()
        };
    }
    async includeMany(parentModule, ...subpaths) {
        return await Promise.all(subpaths.map(this.loadModule.bind(this, parentModule)));
    }
    async loadModule(parentModule, subpath) {
        const definer = ModuleBuilder.normalizeDefiner(await this.import(this.resolveModuleBase(parentModule, subpath)));
        await this.define(parentModule, subpath, definer.name, definer.definer);
        return definer.name;
    }
    async loadRootModule() {
        const definer = ModuleBuilder.normalizeDefiner(await this.import(__classPrivateFieldGet(this, _project).path));
        await this.define(null, __classPrivateFieldGet(this, _project).path, definer.name, definer.definer);
    }
    static normalizeDefiner(definerOrDescriptor) {
        return ("function" === typeof definerOrDescriptor
            ? ModuleBuilder.describeDefiner(definerOrDescriptor)
            : definerOrDescriptor);
    }
    static describeDefiner(definer) {
        return {
            name: definer.name,
            definer
        };
    }
    async import(containingDir) {
        const base = path.join(containingDir, this.getSpecFileBasename());
        let importedModule = null;
        this.emit('loading.module', base);
        for (let ext of ["mjs", "cjs", "js"]) {
            const fullPath = `${base}.${ext}`;
            try {
                importedModule = (await import(fullPath)).default;
                this.emit('loaded.module', fullPath);
                return importedModule;
            }
            catch (e) {
                if ("ERR_MODULE_NOT_FOUND" !== e.code)
                    throw e;
                let butItExistsBooHoo = false;
                try {
                    butItExistsBooHoo = (await fs.promises.stat(fullPath)).isFile();
                }
                catch (v) { }
                if (butItExistsBooHoo)
                    throw e;
            }
        }
        throw new Error(`No zrup module definition file found in ${containingDir}`);
    }
    // noinspection JSMethodCanBeStatic
    getSpecFileBasename() {
        return ".zrup"; //TODO: make configurable
    }
    // noinspection JSMethodCanBeStatic
    resolveModuleBase(parentModule, ...subpathSegments) {
        return parentModule.resolve(path.join(...subpathSegments));
    }
}
_project = new WeakMap(), _ruleBuilder = new WeakMap();
//# sourceMappingURL=module-builder.js.map