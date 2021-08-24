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
var _ModuleBuilder_project, _ModuleBuilder_ruleBuilder;
import fs from "fs";
import { CommandRecipe } from "../build/recipe/command.js";
import { Module, resolveArtifacts } from "../module.js";
import * as path from "path";
import { ZrupAPI } from "./zrup.js";
import EventEmitter from "events";
export class ModuleBuilder extends EventEmitter {
    constructor(project, ruleBuilder) {
        super();
        _ModuleBuilder_project.set(this, void 0);
        _ModuleBuilder_ruleBuilder.set(this, void 0);
        __classPrivateFieldSet(this, _ModuleBuilder_project, project, "f");
        __classPrivateFieldSet(this, _ModuleBuilder_ruleBuilder, ruleBuilder, "f");
    }
    get project() {
        return __classPrivateFieldGet(this, _ModuleBuilder_project, "f");
    }
    async define(parentModule, path, name, definer) {
        const moduleToBeDefined = (parentModule
            ? __classPrivateFieldGet(this, _ModuleBuilder_project, "f").addModule(new Module(parentModule, path, name))
            : Module.createRoot(__classPrivateFieldGet(this, _ModuleBuilder_project, "f"), name));
        this.emit('defining.module', moduleToBeDefined, path, name);
        await definer(this.bindDefinerArgs(moduleToBeDefined));
        this.emit('defined.module', moduleToBeDefined, path, name);
    }
    bindDefinerArgs(module) {
        return {
            module,
            include: this.includeMany.bind(this, module),
            rule: __classPrivateFieldGet(this, _ModuleBuilder_ruleBuilder, "f").bindDefinerAcceptor(module),
            depends: __classPrivateFieldGet(this, _ModuleBuilder_ruleBuilder, "f").depends,
            produces: __classPrivateFieldGet(this, _ModuleBuilder_ruleBuilder, "f").produces,
            after: __classPrivateFieldGet(this, _ModuleBuilder_ruleBuilder, "f").after,
            to: CommandRecipe.to.bind(null, __classPrivateFieldGet(this, _ModuleBuilder_ruleBuilder, "f"), module),
            always: __classPrivateFieldGet(this, _ModuleBuilder_ruleBuilder, "f").always,
            resolve: resolveArtifacts.bind(null, __classPrivateFieldGet(this, _ModuleBuilder_ruleBuilder, "f").artifactManager, module, false),
            also: __classPrivateFieldGet(this, _ModuleBuilder_ruleBuilder, "f").also,
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
        const definer = ModuleBuilder.normalizeDefiner(await this.import(__classPrivateFieldGet(this, _ModuleBuilder_project, "f").path));
        await this.define(null, __classPrivateFieldGet(this, _ModuleBuilder_project, "f").path, definer.name, definer.definer);
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
_ModuleBuilder_project = new WeakMap(), _ModuleBuilder_ruleBuilder = new WeakMap();
//# sourceMappingURL=module-builder.js.map