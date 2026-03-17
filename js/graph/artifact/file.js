import { AID, Artifact, ArtifactFactory, ArtifactResolver } from "../artifact.js";
import md5File from "md5-file";
import fs from "fs";
const fsp = fs.promises;
import * as pathUtils from "path";
import isSubdir from "is-subdir";
import { isNodeError } from "../../util/casts.js";
export class FileArtifact extends Artifact {
    constructor(ref, resolvedPath) {
        super(`${ref}`);
        this.$versionCache = new Map();
        this.$resolvedPath = resolvedPath;
    }
    get exists() {
        return Promise.resolve(fs.existsSync(this.$resolvedPath));
    }
    /**
     * Get version using the default (configured) hash algorithm.
     * Caches the promise to avoid redundant hashing.
     */
    get version() {
        if (!Artifact.hashService) {
            throw new Error("HashService not initialized. Call Artifact.setHashService() first.");
        }
        return this.getVersionUsing(Artifact.hashService.algorithm);
    }
    /**
     * Explicitly set the version when we know it (e.g., after rebuilding).
     * Purges cache and stores single entry with configured algorithm.
     * Caller must wrap the value in a Promise.
     */
    set version(versionPromise) {
        if (!Artifact.hashService) {
            throw new Error("HashService not initialized. Call FileArtifact.setHashService() first.");
        }
        this.$versionCache.clear();
        this.$versionCache.set(Artifact.hashService.algorithm, versionPromise);
    }
    /**
     * Get version using a specific hash algorithm.
     * Used during migration to compute versions with different algorithms.
     * Caches per algorithm to avoid redundant computation.
     *
     * @param algorithm Algorithm to use
     */
    getVersionUsing(algorithm) {
        const cached = this.$versionCache.get(algorithm);
        if (cached)
            return cached;
        const promise = this.computeVersion(algorithm);
        this.$versionCache.set(algorithm, promise);
        return promise;
    }
    async computeVersion(algorithm) {
        try {
            if (!Artifact.hashService) {
                // Fallback to MD5 for testing or non-Build contexts
                return await md5File(this.$resolvedPath);
            }
            return await Artifact.hashService.hashFile(this.$resolvedPath, algorithm);
        }
        catch (e) {
            if (!isNodeError(e) || e.code !== "ENOENT")
                throw e;
        }
        return Artifact.NONEXISTENT_VERSION;
    }
    get contents() { return this.getContents(); }
    async getContents() {
        return await fsp.readFile(this.$resolvedPath, 'utf-8');
    }
    async rm() {
        try {
            await fsp.unlink(this.$resolvedPath);
        }
        catch (e) {
            if (!isNodeError(e) || e.code !== 'ENOENT') {
                throw e;
            }
        }
    }
    async truncate() {
        await fsp.truncate(this.$resolvedPath);
    }
    async append(str) {
        await fsp.mkdir(pathUtils.dirname(this.$resolvedPath), { mode: 0o755, recursive: true });
        await fsp.appendFile(this.$resolvedPath, str);
    }
    async putContents(contents) {
        await fsp.mkdir(pathUtils.dirname(this.$resolvedPath), { mode: 0o755, recursive: true });
        await fsp.writeFile(this.$resolvedPath, contents);
    }
    get caps() {
        return Object.assign({}, super.caps, {
            canWrite: true,
            canRemove: true,
            canBuild: true
        });
    }
}
export class FileArtifactResolver extends ArtifactResolver {
    constructor(project, infix, type) {
        super();
        this.$project = project;
        this.$infix = infix || '';
        this.$type = type || 'file';
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
        const statedModule = aid.module ? this.$project.getModuleByName(aid.module) : this.$project.rootModule;
        if (!statedModule) {
            throw new Error(`Internal error: fallback module resolution failed for AID "${aid.toString()}"`);
        }
        return this.applyInfix(pathUtils.resolve(statedModule.absolutePath, aid.ref));
    }
    resolveModule(aid) {
        const statedModule = aid.module
            ? this.$project.getModuleByName(aid.module)
            : this.$project.rootModule;
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
        return isSubdir(this.treePrefix, pathUtils.resolve(this.$project.path, path));
    }
    applyInfix(path) {
        if (this.isInfixed(path))
            return path;
        const infixed = pathUtils.resolve(this.treePrefix, pathUtils.relative(this.$project.path, pathUtils.resolve(this.$project.path, path)));
        return (pathUtils.isAbsolute(path)
            ? infixed
            : pathUtils.relative(this.$project.path, infixed));
    }
    removeInfix(path) {
        if (!this.isInfixed(path))
            return path;
        const uninfixed = pathUtils.resolve(this.$project.path, pathUtils.relative(this.treePrefix, pathUtils.resolve(this.$project.path, path)));
        return (pathUtils.isAbsolute(path)
            ? uninfixed
            : pathUtils.relative(this.$project.path, uninfixed));
    }
    findClosestModule(externalIdentifier) {
        const uninfixed = this.removeInfix(externalIdentifier);
        let prefix = "";
        let result = null;
        for (let module of this.$project.allModules) {
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
        return this.$type;
    }
    get treeInfix() {
        return this.$infix;
    }
    get treePrefix() {
        return pathUtils.join(this.$project.path, this.treeInfix);
    }
}
export class FileArtifactFactory extends ArtifactFactory {
    constructor(manager, project, type, infix) {
        super(manager, FileArtifact, new FileArtifactResolver(project, infix, type), type);
        this.$project = project;
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
//# sourceMappingURL=file.js.map