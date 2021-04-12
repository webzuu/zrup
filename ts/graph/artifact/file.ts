import {AID, Artifact, ArtifactFactory, ArtifactManager, ArtifactResolver} from "../artifact.js";
import md5File from "md5-file";
import fs from "fs";
const fsp = fs.promises;
import {Module} from "../../module";
import * as pathUtils from "path";
import isSubdir from "is-subdir";
import {Project} from "../../project";

export class FileArtifact extends Artifact  {

    readonly #resolvedPath : string;

    constructor(ref: Artifact.Reference, resolvedPath : string) {
        super(`${ref}`);
        this.#resolvedPath = resolvedPath;
    }

    get exists() : Promise<boolean>
    {
        return Promise.resolve(fs.existsSync(this.#resolvedPath));
    }

    get version() : Promise<string>
    {
        return (async () => {
            try {
                return await md5File(this.#resolvedPath);
            }
            catch(e) {
                if (e.code !== "ENOENT") throw e;
            }
            return Artifact.NONEXISTENT_VERSION;
        })();
    }

    get contents() : Promise<string> { return this.getContents(); }

    async getContents() : Promise<string>
    {
        return await fsp.readFile(this.#resolvedPath,'utf-8');
    }

    async rm() : Promise<void>
    {
        try {
            await fsp.unlink(this.#resolvedPath);
        }
        catch(e) {
            if (e.code !== 'ENOENT') { throw e; }
        }
    }

    async truncate() : Promise<void>
    {
        await fsp.truncate(this.#resolvedPath);
    }

    async append(str : string) : Promise<void>
    {
        await fsp.mkdir(pathUtils.dirname(this.#resolvedPath), {mode: 0o755, recursive: true});
        await fsp.appendFile(this.#resolvedPath, str);
    }

    async putContents(contents : string) : Promise<void>
    {
        await fsp.mkdir(pathUtils.dirname(this.#resolvedPath), {mode: 0o755, recursive: true});
        await fsp.writeFile(this.#resolvedPath, contents);
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
    #project : Project

    readonly #infix : string

    readonly #type : string

    constructor(project: Project, infix?: string, type?: string)
    {
        super();
        this.#project=project
        this.#infix = infix || '';
        this.#type = type || 'file';
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
        const statedModule = aid.module ? this.#project.getModuleByName(aid.module) : this.#project.rootModule;
        if (!statedModule) {
            throw new Error(`Internal error: fallback module resolution failed for AID "${aid.toString()}"`);
        }
        return this.applyInfix(pathUtils.resolve(statedModule.absolutePath, aid.ref));
    }

    resolveModule(aid: AID): { statedModule: Module; closestModule: (Module | null); }
    {
        const statedModule = aid.module
            ? this.#project.getModuleByName(aid.module)
            : this.#project.rootModule

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
        return isSubdir(this.treePrefix, pathUtils.resolve(this.#project.path, path))
    }

    applyInfix(path: string): string
    {
        if (this.isInfixed(path)) return path;
        const infixed = pathUtils.resolve(
            this.treePrefix,
            pathUtils.relative(
                this.#project.path,
                pathUtils.resolve(
                    this.#project.path,
                    path
                )
            )
        );
        return (
            pathUtils.isAbsolute(path)
                ? infixed
                : pathUtils.relative(this.#project.path, infixed)
        );
    }

    removeInfix(path: string): string
    {
        if (!this.isInfixed(path)) return path;
        const uninfixed = pathUtils.resolve(
            this.#project.path,
            pathUtils.relative(
                this.treePrefix,
                pathUtils.resolve(
                    this.#project.path,
                    path
                )
            )
        )
        return (
            pathUtils.isAbsolute(path)
                ? uninfixed
                : pathUtils.relative(this.#project.path, uninfixed)
        );
    }

    findClosestModule(externalIdentifier: string): Module | null
    {
        const uninfixed = this.removeInfix(externalIdentifier);

        let prefix = "";
        let result = null;
        for(let module of this.#project.allModules) {
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
        return this.#type;
    }

    get treeInfix(): string
    {
        return this.#infix;
    }

    get treePrefix(): string
    {
        return pathUtils.join(this.#project.path, this.treeInfix)
    }
}

export class FileArtifactFactory extends ArtifactFactory
{
    #project: Project;

    constructor(manager: ArtifactManager, project: Project, type?: string, infix?: string) {
        super(manager, FileArtifact, new FileArtifactResolver(project, infix, type), type);
        this.#project = project;
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
