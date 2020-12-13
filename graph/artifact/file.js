import {Artifact, ArtifactFactory} from "../artifact";
import md5File from "md5-file";
import fs from "fs";
const fsp = fs.promises;

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
        const statedModule = aid.module
            ? project.getModuleByName(aid.module)
            : project.rootModule

        if (null===statedModule) {
            throw new Error(`Undefined module "${aid.module || "__ROOT__"}"`);
        }
        const path = statedModule.resolve(aid.ref);
        const closestModule = project.findClosestModule(path);
        if (!closestModule) {
            throw new Error(`Path "${path}" appears to be outside project root`);
        }
        if (closestModule !== statedModule) {
            //TODO: warn about incorrect path
            return aid.withModule(closestModule.name).withRef(closestModule.resolve(path));
        }
        return aid;
    }

    normalize(aid)
    {
        return FileArtifactFactory.normalizeUsingProject(aid, this.#project);
    }
}