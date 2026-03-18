import {AID, Artifact, ArtifactFactory, ArtifactManager, ArtifactResolver} from "../artifact.js";
import md5File from "md5-file";
import fs from "fs";
const fsp = fs.promises;
import {Module} from "../../module.js";
import * as pathUtils from "path";
import isSubdir from "is-subdir";
import {Project} from "../../project.js";
import {isNodeError} from "../../util/casts.js";
import {HashService, type HashAlgorithm} from "../../hash/hash-service.js";

export class FileArtifact extends Artifact  {

    private readonly $resolvedPath : string;
    private $versionCache : Map<string, {fromBuilt: boolean, version: Promise<string>}> = new Map();

    constructor(ref: Artifact.Reference, resolvedPath : string) {
        super(`${ref}`);
        this.$resolvedPath = resolvedPath;
    }

    get exists() : Promise<boolean>
    {
        return Promise.resolve(fs.existsSync(this.$resolvedPath));
    }

    /**
     * Get version using the default (configured) hash algorithm.
     * Caches the promise to avoid redundant hashing.
     */
    get version() : Promise<string>
    {
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
    set version(versionPromise: Promise<string>) {
        if (!Artifact.hashService) {
            throw new Error("HashService not initialized. Call FileArtifact.setHashService() first.");
        }
        this.$versionCache.clear();
        this.$versionCache.set(Artifact.hashService.algorithm, {
            fromBuilt: this.built,
            version: versionPromise
        });
    }

    /**
     * Get version using a specific hash algorithm.
     * Used during migration to compute versions with different algorithms.
     * Caches per algorithm to avoid redundant computation.
     * Cache entries are invalidated when artifact is rebuilt.
     *
     * @param algorithm Algorithm to use
     */
    getVersionUsing(algorithm: string): Promise<string>
    {
        const cached = this.$versionCache.get(algorithm);
        if (cached && cached.fromBuilt === this.built) {
            return cached.version;
        }

        const promise = this.computeVersion(algorithm);
        this.$versionCache.set(algorithm, {
            fromBuilt: this.built,
            version: promise
        });
        return promise;
    }

    private async computeVersion(algorithm: string): Promise<string>
    {
        try {
            if (!Artifact.hashService) {
                // Fallback to MD5 for testing or non-Build contexts
                return await md5File(this.$resolvedPath);
            }
            return await Artifact.hashService.hashFile(
                this.$resolvedPath,
                algorithm as HashAlgorithm
            );
        }
        catch(e) {
            if (!isNodeError(e) || e.code !== "ENOENT") throw e;
        }
        return Artifact.NONEXISTENT_VERSION;
    }

    get contents() : Promise<string> { return this.getContents(); }

    async getContents() : Promise<string>
    {
        return await fsp.readFile(this.$resolvedPath,'utf-8');
    }

    async rm() : Promise<void>
    {
        try {
            await fsp.unlink(this.$resolvedPath);
        }
        catch(e) {
            if (!isNodeError(e) || e.code !== 'ENOENT') { throw e; }
        }
    }

    async truncate() : Promise<void>
    {
        await fsp.truncate(this.$resolvedPath);
    }

    async append(str : string) : Promise<void>
    {
        await fsp.mkdir(pathUtils.dirname(this.$resolvedPath), {mode: 0o755, recursive: true});
        await fsp.appendFile(this.$resolvedPath, str);
    }

    async putContents(contents : string) : Promise<void>
    {
        await fsp.mkdir(pathUtils.dirname(this.$resolvedPath), {mode: 0o755, recursive: true});
        await fsp.writeFile(this.$resolvedPath, contents);
    }

    get caps() : Artifact.Caps
    {
        return Object.assign({}, super.caps, {
            canWrite: true,
            canRemove: true,
            canBuild: true
        });
    }
}

export class FileArtifactResolver extends ArtifactResolver
{
    private $project : Project

    private readonly $infix : string

    private readonly $type : string

    constructor(project: Project, infix?: string, type?: string)
    {
        super();
        this.$project=project
        this.$infix = infix || '';
        this.$type = type || 'file';
    }

    normalize(aid: AID): AID {
        aid = super.normalize(aid);
        const {statedModule, closestModule} = this.resolveModule(aid);
        if (!closestModule) {
            throw new Error(`Could not find module responsible for "${aid}"`);
        }
        if (closestModule !== statedModule) {
            //TODO: warn about artifact aliasing
            const absolutePath = pathUtils.resolve(statedModule.absolutePath, aid.ref);
            const relativeToClosest = pathUtils.relative(closestModule.absolutePath, absolutePath)
            return aid.withModule(closestModule.name).withRef(relativeToClosest);
        }
        return aid.withModule(closestModule.name).withType(this.type);
    }

    resolveToExternalIdentifier(aid: AID): string {
        const statedModule = aid.module ? this.$project.getModuleByName(aid.module) : this.$project.rootModule;
        if (!statedModule) {
            throw new Error(`Internal error: fallback module resolution failed for AID "${aid.toString()}"`);
        }
        return this.applyInfix(pathUtils.resolve(statedModule.absolutePath, aid.ref));
    }

    resolveModule(aid: AID): { statedModule: Module; closestModule: (Module | null); }
    {
        const statedModule = aid.module
            ? this.$project.getModuleByName(aid.module)
            : this.$project.rootModule

        if (!statedModule) {
            if (aid.module) {
                throw new Error(`Undefined module specified in AID "${aid}"`);
            }
            else {
                throw new Error(
                    `Cannot resolve module-less AID "${aid}" because no root module is defined for the project`
                )
            }
        }
        const path = this.resolveToExternalIdentifier(aid);
        return {statedModule, closestModule: this.findClosestModule(path)};
    }

    isInfixed(path: string): boolean
    {
        return isSubdir(this.treePrefix, pathUtils.resolve(this.$project.path, path))
    }

    applyInfix(path: string): string
    {
        if (this.isInfixed(path)) return path;
        const infixed = pathUtils.resolve(
            this.treePrefix,
            pathUtils.relative(
                this.$project.path,
                pathUtils.resolve(
                    this.$project.path,
                    path
                )
            )
        );
        return (
            pathUtils.isAbsolute(path)
                ? infixed
                : pathUtils.relative(this.$project.path, infixed)
        );
    }

    removeInfix(path: string): string
    {
        if (!this.isInfixed(path)) return path;
        const uninfixed = pathUtils.resolve(
            this.$project.path,
            pathUtils.relative(
                this.treePrefix,
                pathUtils.resolve(
                    this.$project.path,
                    path
                )
            )
        )
        return (
            pathUtils.isAbsolute(path)
                ? uninfixed
                : pathUtils.relative(this.$project.path, uninfixed)
        );
    }

    findClosestModule(externalIdentifier: string): Module | null
    {
        const uninfixed = this.removeInfix(externalIdentifier);

        let prefix = "";
        let result = null;
        for(let module of this.$project.allModules) {
            const modulePath = module.absolutePath;
            if (
                (
                    uninfixed.length === modulePath.length
                    || uninfixed.length > modulePath.length && uninfixed.charAt(modulePath.length) === "/"
                )
                && uninfixed.startsWith(modulePath)
            ) {
                prefix = modulePath;
                result = module;
            }
        }
        return result;
    }

    get type(): string {
        return this.$type;
    }

    get treeInfix(): string
    {
        return this.$infix;
    }

    get treePrefix(): string
    {
        return pathUtils.join(this.$project.path, this.treeInfix)
    }
}

export class FileArtifactFactory extends ArtifactFactory
{
    private $project: Project;

    constructor(manager: ArtifactManager, project: Project, type?: string, infix?: string) {
        super(manager, FileArtifact, new FileArtifactResolver(project, infix, type), type);
        this.$project = project;
    }

    get fileResolver() : FileArtifactResolver {
        return this.resolver as FileArtifactResolver;
    }

    prependRequiredConstructorArgs(ref: Artifact.Reference, extraArgs: string[])
    {
        return [
            this.resolveToExternalIdentifier(new AID(''+ref)),
            ...extraArgs
        ];
    }

    findClosestModule(externalIdentifier: string): Module | null
    {
        return this.fileResolver.findClosestModule(externalIdentifier)
    }

    isInfixed(path: string): boolean
    {
        return this.fileResolver.isInfixed(path);
    }

    applyInfix(path: string): string
    {
        return this.fileResolver.applyInfix(path);
    }

    removeInfix(path: string): string
    {
        return this.fileResolver.removeInfix(path);
    }

    get treeInfix(): string
    {
        return this.fileResolver.treeInfix;
    }

    get treePrefix(): string
    {
        return this.fileResolver.treePrefix;
    }
}
