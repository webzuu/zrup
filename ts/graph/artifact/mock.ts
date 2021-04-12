import {AID, Artifact, ArtifactManager, ArtifactFactory} from "../artifact";
import {PromiseKeeper} from "../../util/promise-keeper";
import {FileArtifactFactory, FileArtifactResolver} from "./file";
import {Project} from "../../project";

export class MockArtifact extends Artifact

{
    #pk: PromiseKeeper;
    readonly #type : string;

    constructor(ref: Artifact.Reference, type: string | undefined, pk: PromiseKeeper)
    {
        super(new AID(ref+'').withType(type).toString());
        this.#pk=pk;
        this.#type=type || 'file';
    }

    get type() : string
    {
        return this.#type;
    }

    get exists() : Promise<boolean>
    {
        return this.#pk.about(this.key, "exists").promise;
    }

    get version() : Promise<string>
    {
        return this.#pk.about(this.key, "version").promise;
    }

    async getContents() : Promise<string>
    {
        return await this.#pk.about(this.key, "contents").promise;
    }

    async putContents(contents: string)
    {
        this.#pk.set(this.key, "contents", contents);
    }

    async rm()
    {
        this.#pk.forget(this.key, "exists");
        this.#pk.forget(this.key, "version");
        this.#pk.forget(this.key, "contents");
        this.#pk.set(this.key, "exists", false);
        this.#pk.set(this.key, "version", Artifact.NONEXISTENT_VERSION);
    }


    get caps() {
        return {
            canWrite: true,
            canRemove: true,
            canBuild: true
        };
    }

    static get type() : string {
        throw new Error(
            "MockArtifact has dynamic artifact type. If you are trying to subclass ArtifactFactory to make instances"
            +" of MockArtifact mocking a specific type, you need to override the type property on the factory" +
            +" class constructor"
        );
    }

    static get constructorOfThisClass() { return this; }
}

export class MockFileFactory extends ArtifactFactory
{
    #project: Project

    readonly #pk: PromiseKeeper;

    constructor(manager: ArtifactManager, project: Project, pk: PromiseKeeper)
    {
        super(manager, MockArtifact, new FileArtifactResolver(project), "file");
        this.#project = project;
        this.#pk = pk;
    }

    prependRequiredConstructorArgs(aid: Artifact.Reference, extraArgs: any[])
    {
        return [MockFileFactory.type, this.#pk, ...super.prependRequiredConstructorArgs(aid, extraArgs)];
    }

    static get type() : string { return "file"; };
}

Object.assign(
    MockFileFactory.prototype,
    {
        normalize: FileArtifactFactory.prototype.normalize
    }
)
