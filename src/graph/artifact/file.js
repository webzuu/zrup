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
var _resolvedPath, _project, _infix, _type, _project_1;
import { AID, Artifact, ArtifactFactory, ArtifactResolver } from "../artifact.js";
import md5File from "md5-file";
import fs from "fs";
const fsp = fs.promises;
import * as pathUtils from "path";
import isSubdir from "is-subdir";
export class FileArtifact extends Artifact {
    constructor(ref, resolvedPath) {
        super(`${ref}`);
        _resolvedPath.set(this, void 0);
        __classPrivateFieldSet(this, _resolvedPath, resolvedPath);
    }
    get exists() {
        return Promise.resolve(fs.existsSync(__classPrivateFieldGet(this, _resolvedPath)));
    }
    get version() {
        return (async () => {
            try {
                return await md5File(__classPrivateFieldGet(this, _resolvedPath));
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
        return await fsp.readFile(__classPrivateFieldGet(this, _resolvedPath), 'utf-8');
    }
    async rm() {
        try {
            await fsp.unlink(__classPrivateFieldGet(this, _resolvedPath));
        }
        catch (e) {
            if (e.code !== 'ENOENT') {
                throw e;
            }
        }
    }
    async truncate() {
        await fsp.truncate(__classPrivateFieldGet(this, _resolvedPath));
    }
    async append(str) {
        await fsp.mkdir(pathUtils.dirname(__classPrivateFieldGet(this, _resolvedPath)), { mode: 0o755, recursive: true });
        await fsp.appendFile(__classPrivateFieldGet(this, _resolvedPath), str);
    }
    async putContents(contents) {
        await fsp.mkdir(pathUtils.dirname(__classPrivateFieldGet(this, _resolvedPath)), { mode: 0o755, recursive: true });
        await fsp.writeFile(__classPrivateFieldGet(this, _resolvedPath), contents);
    }
    get caps() {
        return Object.assign({}, super.caps, {
            canWrite: true,
            canRemove: true,
            canBuild: true
        });
    }
}
_resolvedPath = new WeakMap();
export class FileArtifactResolver extends ArtifactResolver {
    constructor(project, infix, type) {
        super();
        _project.set(this, void 0);
        _infix.set(this, void 0);
        _type.set(this, void 0);
        __classPrivateFieldSet(this, _project, project);
        __classPrivateFieldSet(this, _infix, infix || '');
        __classPrivateFieldSet(this, _type, type || 'file');
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
        const statedModule = aid.module ? __classPrivateFieldGet(this, _project).getModuleByName(aid.module) : __classPrivateFieldGet(this, _project).rootModule;
        if (!statedModule) {
            throw new Error(`Internal error: fallback module resolution failed for AID "${aid.toString()}"`);
        }
        return this.applyInfix(pathUtils.resolve(statedModule.absolutePath, aid.ref));
    }
    resolveModule(aid) {
        const statedModule = aid.module
            ? __classPrivateFieldGet(this, _project).getModuleByName(aid.module)
            : __classPrivateFieldGet(this, _project).rootModule;
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
        return isSubdir(this.treePrefix, pathUtils.resolve(__classPrivateFieldGet(this, _project).path, path));
    }
    applyInfix(path) {
        if (this.isInfixed(path))
            return path;
        const infixed = pathUtils.resolve(this.treePrefix, pathUtils.relative(__classPrivateFieldGet(this, _project).path, pathUtils.resolve(__classPrivateFieldGet(this, _project).path, path)));
        return (pathUtils.isAbsolute(path)
            ? infixed
            : pathUtils.relative(__classPrivateFieldGet(this, _project).path, infixed));
    }
    removeInfix(path) {
        if (!this.isInfixed(path))
            return path;
        const uninfixed = pathUtils.resolve(__classPrivateFieldGet(this, _project).path, pathUtils.relative(this.treePrefix, pathUtils.resolve(__classPrivateFieldGet(this, _project).path, path)));
        return (pathUtils.isAbsolute(path)
            ? uninfixed
            : pathUtils.relative(__classPrivateFieldGet(this, _project).path, uninfixed));
    }
    findClosestModule(externalIdentifier) {
        const uninfixed = this.removeInfix(externalIdentifier);
        let prefix = "";
        let result = null;
        for (let module of __classPrivateFieldGet(this, _project).allModules) {
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
        return __classPrivateFieldGet(this, _type);
    }
    get treeInfix() {
        return __classPrivateFieldGet(this, _infix);
    }
    get treePrefix() {
        return pathUtils.join(__classPrivateFieldGet(this, _project).path, this.treeInfix);
    }
}
_project = new WeakMap(), _infix = new WeakMap(), _type = new WeakMap();
export class FileArtifactFactory extends ArtifactFactory {
    constructor(manager, project, type, infix) {
        super(manager, FileArtifact, new FileArtifactResolver(project, infix, type), type);
        _project_1.set(this, void 0);
        __classPrivateFieldSet(this, _project_1, project);
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
_project_1 = new WeakMap();
//# sourceMappingURL=file.js.map