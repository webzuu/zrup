import Artifact from "@zrup/artifact";

export default class MockArtifact extends Artifact
{
    /**
     * @type {PromiseKeeper}
     */
    #pk;
    #type;
    #key;
    #version;
    #existsDelay;
    #versionDelay;
    constructor(pk, type, key, version)
    {
        super();
        this.#pk=type;
        this.#type=type;
        this.#key=key;
        this.#version = version || null;

        this.#existsDelay = [0,0];
        this.#versionDelay = [0,0];
    }

    get type()
    {
        return this.#type;
    }

    get exists()
    {
        return this.#pk.about(this.#key,"exists").promise;
    }

    get version()
    {
        return this.#pk.about(this.#key,"version").promise;
    }

    get identity()
    {
        return this.#key;
    }
}