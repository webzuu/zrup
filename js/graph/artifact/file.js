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
var _FileArtifact_resolvedPath, _FileArtifactResolver_project, _FileArtifactResolver_infix, _FileArtifactResolver_type, _FileArtifactFactory_project;
import { AID, Artifact, ArtifactFactory, ArtifactResolver } from "../artifact.js";
import md5File from "md5-file";
import fs from "fs";
const fsp = fs.promises;
import * as pathUtils from "path";
import isSubdir from "is-subdir";
export class FileArtifact extends Artifact {
    constructor(ref, resolvedPath) {
        super(`${ref}`);
        _FileArtifact_resolvedPath.set(this, void 0);
        __classPrivateFieldSet(this, _FileArtifact_resolvedPath, resolvedPath, "f");
    }
    get exists() {
        return Promise.resolve(fs.existsSync(__classPrivateFieldGet(this, _FileArtifact_resolvedPath, "f")));
    }
    get version() {
        return (async () => {
            try {
                return await md5File(__classPrivateFieldGet(this, _FileArtifact_resolvedPath, "f"));
            }
            catch (e) {
                if (e.code !== "ENOENT")
                    throw e;
            }
            return Artifact.NONEXISTENT_VERSION;
        })();
    }
    get contents() { return this.getContents(); }
    async getContents() {
        return await fsp.readFile(__classPrivateFieldGet(this, _FileArtifact_resolvedPath, "f"), 'utf-8');
    }
    async rm() {
        try {
            await fsp.unlink(__classPrivateFieldGet(this, _FileArtifact_resolvedPath, "f"));
        }
        catch (e) {
            if (e.code !== 'ENOENT') {
                throw e;
            }
        }
    }
    async truncate() {
        await fsp.truncate(__classPrivateFieldGet(this, _FileArtifact_resolvedPath, "f"));
    }
    async append(str) {
        await fsp.mkdir(pathUtils.dirname(__classPrivateFieldGet(this, _FileArtifact_resolvedPath, "f")), { mode: 0o755, recursive: true });
        await fsp.appendFile(__classPrivateFieldGet(this, _FileArtifact_resolvedPath, "f"), str);
    }
    async putContents(contents) {
        await fsp.mkdir(pathUtils.dirname(__classPrivateFieldGet(this, _FileArtifact_resolvedPath, "f")), { mode: 0o755, recursive: true });
        await fsp.writeFile(__classPrivateFieldGet(this, _FileArtifact_resolvedPath, "f"), contents);
    }
    get caps() {
        return Object.assign({}, super.caps, {
            canWrite: true,
            canRemove: true,
            canBuild: true
        });
    }
}
_FileArtifact_resolvedPath = new WeakMap();
export class FileArtifactResolver extends ArtifactResolver {
    constructor(project, infix, type) {
        super();
        _FileArtifactResolver_project.set(this, void 0);
        _FileArtifactResolver_infix.set(this, void 0);
        _FileArtifactResolver_type.set(this, void 0);
        __classPrivateFieldSet(this, _FileArtifactResolver_project, project, "f");
        __classPrivateFieldSet(this, _FileArtifactResolver_infix, infix || '', "f");
        __classPrivateFieldSet(this, _FileArtifactResolver_type, type || 'file', "f");
    }
    normalize(aid) {
        aid = super.normalize(aid);
        const { statedModule, closestModule } = this.resolveModule(aid);
        if (!closestModule) {
            throw new Error(`Could not find module responsible for "${aid}"`);
        }
        if (closestModule !== statedModule) {
            //TODO: warn about artifact aliasing
            const absolutePath = pathUtils.resolve(statedModule.absolutePath, aid.ref);
            const relativeToClosest = pathUtils.relative(closestModule.absolutePath, absolutePath);
            return aid.withModule(closestModule.name).withRef(relativeToClosest);
        }
        return aid.withModule(closestModule.name).withType(this.type);
    }
    resolveToExternalIdentifier(aid) {
        const statedModule = aid.module ? __classPrivateFieldGet(this, _FileArtifactResolver_project, "f").getModuleByName(aid.module) : __classPrivateFieldGet(this, _FileArtifactResolver_project, "f").rootModule;
        if (!statedModule) {
            throw new Error(`Internal error: fallback module resolution failed for AID "${aid.toString()}"`);
        }
        return this.applyInfix(pathUtils.resolve(statedModule.absolutePath, aid.ref));
    }
    resolveModule(aid) {
        const statedModule = aid.module
            ? __classPrivateFieldGet(this, _FileArtifactResolver_project, "f").getModuleByName(aid.module)
            : __classPrivateFieldGet(this, _FileArtifactResolver_project, "f").rootModule;
        if (!statedModule) {
            if (aid.module) {
                throw new Error(`Undefined module specified in AID "${aid}"`);
            }
            else {
                throw new Error(`Cannot resolve module-less AID "${aid}" because no root module is defined for the project`);
            }
        }
        const path = this.resolveToExternalIdentifier(aid);
        return { statedModule, closestModule: this.findClosestModule(path) };
    }
    isInfixed(path) {
        return isSubdir(this.treePrefix, pathUtils.resolve(__classPrivateFieldGet(this, _FileArtifactResolver_project, "f").path, path));
    }
    applyInfix(path) {
        if (this.isInfixed(path))
            return path;
        const infixed = pathUtils.resolve(this.treePrefix, pathUtils.relative(__classPrivateFieldGet(this, _FileArtifactResolver_project, "f").path, pathUtils.resolve(__classPrivateFieldGet(this, _FileArtifactResolver_project, "f").path, path)));
        return (pathUtils.isAbsolute(path)
            ? infixed
            : pathUtils.relative(__classPrivateFieldGet(this, _FileArtifactResolver_project, "f").path, infixed));
    }
    removeInfix(path) {
        if (!this.isInfixed(path))
            return path;
        const uninfixed = pathUtils.resolve(__classPrivateFieldGet(this, _FileArtifactResolver_project, "f").path, pathUtils.relative(this.treePrefix, pathUtils.resolve(__classPrivateFieldGet(this, _FileArtifactResolver_project, "f").path, path)));
        return (pathUtils.isAbsolute(path)
            ? uninfixed
            : pathUtils.relative(__classPrivateFieldGet(this, _FileArtifactResolver_project, "f").path, uninfixed));
    }
    findClosestModule(externalIdentifier) {
        const uninfixed = this.removeInfix(externalIdentifier);
        let prefix = "";
        let result = null;
        for (let module of __classPrivateFieldGet(this, _FileArtifactResolver_project, "f").allModules) {
            const modulePath = module.absolutePath;
            if ((uninfixed.length === modulePath.length
                || uninfixed.length > modulePath.length && uninfixed.charAt(modulePath.length) === "/")
                && uninfixed.startsWith(modulePath)) {
                prefix = modulePath;
                result = module;
            }
        }
        return result;
    }
    get type() {
        return __classPrivateFieldGet(this, _FileArtifactResolver_type, "f");
    }
    get treeInfix() {
        return __classPrivateFieldGet(this, _FileArtifactResolver_infix, "f");
    }
    get treePrefix() {
        return pathUtils.join(__classPrivateFieldGet(this, _FileArtifactResolver_project, "f").path, this.treeInfix);
    }
}
_FileArtifactResolver_project = new WeakMap(), _FileArtifactResolver_infix = new WeakMap(), _FileArtifactResolver_type = new WeakMap();
export class FileArtifactFactory extends ArtifactFactory {
    constructor(manager, project, type, infix) {
        super(manager, FileArtifact, new FileArtifactResolver(project, infix, type), type);
        _FileArtifactFactory_project.set(this, void 0);
        __classPrivateFieldSet(this, _FileArtifactFactory_project, project, "f");
    }
    get fileResolver() {
        return this.resolver;
    }
    prependRequiredConstructorArgs(ref, extraArgs) {
        return [
            this.resolveToExternalIdentifier(new AID('' + ref)),
            ...extraArgs
        ];
    }
    findClosestModule(externalIdentifier) {
        return this.fileResolver.findClosestModule(externalIdentifier);
    }
    isInfixed(path) {
        return this.fileResolver.isInfixed(path);
    }
    applyInfix(path) {
        return this.fileResolver.applyInfix(path);
    }
    removeInfix(path) {
        return this.fileResolver.removeInfix(path);
    }
    get treeInfix() {
        return this.fileResolver.treeInfix;
    }
    get treePrefix() {
        return this.fileResolver.treePrefix;
    }
}
_FileArtifactFactory_project = new WeakMap();
//# sourceMappingURL=file.js.map