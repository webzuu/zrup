import {Artifact} from "@zrup/graph/artifact";

export class MockArtifact extends Artifact
{
    /**
     * @type {PromiseKeeper}
     */
    #pk;
    #type;
    #key;
    constructor(pk, type, key)
    {
        super();
        this.#pk=pk;
        this.#type=type;
        this.#key=key;
    }

    get type()
    {
        return this.#type;
    }

    get exists()
    {
        return this.#pk.about(this.key,"exists").promise;
    }

    get version()
    {
        return this.#pk.about(this.key,"version").promise;
    }

    get identity()
    {
        return this.#key;
    }

    get contents()
    {
        return this.#pk.about(this.key,"contents").promise;
    }
}
