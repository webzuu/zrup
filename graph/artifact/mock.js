import {AID, Artifact, ArtifactManager, ArtifactFactory} from "../artifact";
import {PromiseKeeper} from "../../util/promise-keeper";
import * as path from "path";
import {FileArtifactFactoryAbstract, FileArtifactResolver} from "./file";

export class MockArtifact extends Artifact
{
    /** @type {PromiseKeeper} */
    #pk;
    #type;

    /**
     * @param {Artifact~Reference} ref
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

    static get type() {
        throw new Error(
            "MockArtifact has dynamic artifact type. If you are trying to subclass ArtifactFactory to make instances"
            +" of MockArtifact mocking a specific type, you need to override the type property on the factory" +
            +" class constructor"
        );
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
        super(manager, MockArtifact, new FileArtifactResolver(project));
        this.#project = project;
        this.#pk = pk;
    }

    prependRequiredConstructorArgs(aid, extraArgs)
    {
        return [MockFileFactory.type, this.#pk, ...super.prependRequiredConstructorArgs(aid, extraArgs)];
    }

    static get type() { return "file"; };
}

Object.assign(
    MockFileFactory.prototype,
    {
        normalize: FileArtifactFactoryAbstract.prototype.normalize,
        resolveModule: FileArtifactFactoryAbstract.prototype.resolveModule
    }
)
