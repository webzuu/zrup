import {AID, Artifact, ArtifactFactory, ArtifactResolver} from "../artifact";
import md5File from "md5-file";
import fs from "fs";
const fsp = fs.promises;
import {Module} from "../../module";
import * as pathUtils from "path";
import isSubdir from "is-subdir";

export class FileArtifact extends Artifact {
    #resolvedPath;

    /**
     * @param {Artifact~Reference} ref
     * @param {string} resolvedPath
     */
    constructor(ref, resolvedPath) {
        super(`${ref}`);
        this.#resolvedPath = resolvedPath;
    }

    get exists()
    {
        return Promise.resolve(fs.existsSync(this.#resolvedPath));
    }

    get version()
    {
        return (async () => {
            try {
                return await md5File(this.#resolvedPath);
            }
            catch(e) {
                //TODO: examine the cause of error, don't assume it's because the file didn't exist
            }
            return Artifact.NONEXISTENT_VERSION;
        })();
    }

    /** @return {Promise<string|null>} */
    get contents() { return this.getContents(); }

    /** @return {Promise<string|null>} */
    async getContents()
    {
        return await fsp.readFile(this.#resolvedPath,'utf-8');
    }

    async rm()
    {
        try {
            await fsp.unlink(this.#resolvedPath);
        }
        catch(e) {
            if (e.code !== 'ENOENT') { throw e; }
        }
    }

    /** @return {Promise<void>} */
    async putContents(contents)
    {
        await fsp.mkdir(pathUtils.dirname(this.#resolvedPath), {mode: 0o755, recursive: true});
        await fsp.writeFile(this.#resolvedPath, contents);
    }

    get caps()
    {
        return Object.assign({}, super.caps, {canRemove: true});
    }

    static get type() { return "file"; }
}

export class FileArtifactResolver extends ArtifactResolver
{
    /** @type {Project} */
    #project

    /** @type {string} */
    #infix

    /**
     * @param {Project} project
     * @param {string|undefined} [infix]
     */
    constructor(project, infix)
    {
        super();
        this.#project=project
        this.#infix = infix || '';
    }

    /**
     * @param {AID} aid
     * @return {AID}
     */
    normalize(aid) {
        const {statedModule, closestModule} = this.resolveModule(aid);
        if (!closestModule) {
            throw new Error(`Could not find module responsible for "${aid}"`);
        }
        if (closestModule !== statedModule) {
            //TODO: warn about artifact aliasing
            const absolutePath = pathUtils.resolve(statedModule.absolutePath, aid.ref);
            const relativeToClosest = pathUtils.relative(absolutePath, closestModule.absolutePath)
            return aid.withModule(closestModule.name).withRef(relativeToClosest);
        }
        return aid.withModule(closestModule.name).withType(this.type);
    }

    /**
     * @param {AID} aid
     * @return {string}
     */
    resolveToExternalIdentifier(aid) {
        const statedModule = aid.module ? this.#project.getModuleByName(aid.module) : this.#project.rootModule;
        return this.applyInfix(pathUtils.resolve(statedModule.absolutePath, aid.ref));
    }

    /**
     * @param {AID} aid
     * @return {{statedModule: Module, closestModule: (Module|null)}}
     */
    resolveModule(aid)
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

    /**
     * @param {string} path
     * @return {boolean}
     */
    isInfixed(path)
    {
        return isSubdir(this.treePrefix, pathUtils.resolve(this.#project.path, path))
    }

    /**
     * @param {string} path
     * @return {string}
     */
    applyInfix(path)
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

    /**
     * @param {string} path
     * @return {string}
     */
    removeInfix(path)
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

    /**
     * @param {string} externalIdentifier
     * @return {Module|null}
     */
    findClosestModule(externalIdentifier)
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

    /** @return {string} */
    get type() {
        return "file";
    }

    /** @return {string} */
    get treeInfix()
    {
        return this.#infix;
    }

    /** @return {string} */
    get treePrefix()
    {
        return pathUtils.join(this.#project.path, this.treeInfix)
    }
}

/**
 * @property {FileArtifactResolver} resolver
 * @abstract
 */
export class FileArtifactFactoryAbstract extends ArtifactFactory
{
    /** @type {Project} */
    #project;

    /**
     * @param {ArtifactManager} manager
     * @param {Project} project
     * @param {Artifact~ClassConstructor} artifactConstructor
     * @param {FileArtifactResolver} resolver
     */
    constructor(
        manager,
        project,
        artifactConstructor,
        resolver
    ) {
        super(manager, artifactConstructor, resolver);
        this.#project = project;
    }

    prependRequiredConstructorArgs(ref, extraArgs)
    {
        return [
            this.resolveToExternalIdentifier(new AID(''+ref)),
            ...extraArgs
        ]
    }
    /**
     * @param {string} externalIdentifier
     * @return {Module|null}
     */
    findClosestModule(externalIdentifier)
    {
        return this.resolver.findClosestModule(externalIdentifier)
    }

    /**
     * @param {string} path
     * @return {boolean}
     */
    isInfixed(path)
    {
        return this.resolver.isInfixed(path);
    }

    /**
     * @param {string} path
     * @return {string}
     */
    applyInfix(path)
    {
        return this.resolver.applyInfix(path);
    }

    /**
     * @param {string} path
     * @return {string}
     */
    removeInfix(path)
    {
        return this.resolver.removeInfix(path);
    }

    /** @return {string} */
    get treeInfix()
    {
        return this.resolver.treeInfix;
    }

    /** @return {string} */
    get treePrefix()
    {
        return this.resolver.treePrefix;
    }
}

export class FileArtifactFactory extends FileArtifactFactoryAbstract
{
    /**
     * @param {ArtifactManager} manager
     * @param {Project} project
     * @param {string|undefined} [infix]
     */
    constructor(manager, project, infix) {
        super(manager, project, FileArtifact, new FileArtifactResolver(project, infix));
    }
}
