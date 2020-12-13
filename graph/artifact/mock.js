import {AID, Artifact, ArtifactManager, ArtifactFactory} from "../artifact";
import {PromiseKeeper} from "../../util/promise-keeper";
import {FileArtifactFactory} from "./file";

export class MockArtifact extends Artifact
{
    /** @type {PromiseKeeper} */
    #pk;
    #type;

    /**
     * @param {Artifact~reference} ref
     * @param {string} type
     * @param {PromiseKeeper} pk
     */
    constructor(ref, type, pk)
    {
        super(new AID(ref).withType(type).toString());
        this.#pk=pk;
        this.#type=type;
    }

    get type()
    {
        return this.#type;
    }

    get exists()
    {
        return this.#pk.about(this.key, "exists").promise;
    }

    get version()
    {
        return this.#pk.about(this.key, "version").promise;
    }

    async getContents()
    {
        return await this.#pk.about(this.key, "contents").promise;
    }

    async putContents(contents)
    {
        this.#pk.set(this.key, "contents", contents);
    }
}

export class MockFileFactory extends ArtifactFactory
{
    /** @type {Project} */
    #project

    /** @type {PromiseKeeper} */
    #pk;

    /**
     * @param {ArtifactManager} manager
     * @param {Project} project
     * @param {PromiseKeeper} pk
     */
    constructor(manager, project, pk)
    {
        super(manager, MockArtifact);
        this.#project = project;
        this.#pk = pk;
    }

    prependRequiredConstructorArgs(extraArgs)
    {
        return [MockFileFactory.type, this.#pk, ...super.prependRequiredConstructorArgs(extraArgs)];
    }

    normalize(aid)
    {
        return FileArtifactFactory.normalizeUsingProject(aid, this.#project);
    }

    static type = "file";
}
