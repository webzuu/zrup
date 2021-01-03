import {AID, Artifact, ArtifactFactory} from "../artifact";
import md5File from "md5-file";
import fs from "fs";
const fsp = fs.promises;
import {Module} from "../../module";

export class FileArtifact extends Artifact {
    #resolvedPath;

    /**
     *
     * @param {Artifact~reference} ref
     * @param {string} resolvedPath
     */
    constructor(ref, resolvedPath) {
        super(`${ref}`);
        this.#resolvedPath = resolvedPath;
    }

    get type()
    {
        return "file";
    }

    get exists()
    {
        return Promise.resolve(fs.existsSync(this.#resolvedPath));
    }

    /**
     * @return {Promise<string>}
     */
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

    get contents() { return this.getContents(); }

    async getContents()
    {
        return await fsp.readFile(this.#resolvedPath);
    }

    async putContents(contents)
    {
        await fsp.writeFile(this.#resolvedPath, contents);
    }

    static get type() { return "file"; }
}


export class FileArtifactFactory extends ArtifactFactory
{
    /** @type {Project} */
    #project;

    /**
     * @param {ArtifactManager} manager
     * @param {Project} project
     */
    constructor(manager, project) {
        super(manager, FileArtifact);
        this.#project = project;
    }

    /**
     * @param {AID} aid
     * @param {Project} project
     * @return {AID}
     */
    static normalizeUsingProject(aid, project) {
        const {statedModule, closestModule} = FileArtifactFactory.resolveModuleUsingProject(aid, project);
        if (!closestModule) {
            throw new Error(`Could not find module responsible for "${aid}"`);
        }
        if (closestModule !== statedModule) {
            //TODO: warn about incorrect path
            return aid.withModule(closestModule.name).withRef(closestModule.resolve(path));
        }
        return aid.withModule(closestModule.name);
    }

    /**
     * @param {AID} aid
     * @param {Project} project
     * @return {{statedModule: Module, closestModule: (Module|null)}}
     */
    static resolveModuleUsingProject(aid, project)
    {
        const statedModule = aid.module
            ? project.getModuleByName(aid.module)
            : project.rootModule

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
        const path = statedModule.resolve(aid.ref);
        return {statedModule, closestModule: project.findClosestModule(path)};
    }

    normalize(aid)
    {
        return FileArtifactFactory.normalizeUsingProject(super.normalize(aid), this.#project);
    }


    prependRequiredConstructorArgs(ref, extraArgs)
    {
        const {closestModule} = FileArtifactFactory.resolveModuleUsingProject(new AID(ref), this.#project);
        return [
            closestModule.resolve(new AID(ref).withModule(closestModule.name)),
            ...extraArgs
        ]
    }
}

/**
 * @typedef {(Module|null)} FileArtifactFactory~ModuleOpt
 */