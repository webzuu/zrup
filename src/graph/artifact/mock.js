import Artifact from "@zrup/artifact";

function delayedPromise(getter, minDelay, maxDelay)
{
    minDelay = minDelay || 0;
    maxDelay = Math.max(minDelay, maxDelay || minDelay);
    const delay = Math.round(Math.random() * (maxDelay - minDelay) + minDelay);
    return new Promise((resolve)=>{ setTimeout(() => resolve(getter()), delay); });
}

export default class MockArtifact extends Artifact
{
    #type;
    #key;
    #version;
    constructor(type, key, version)
    {
        super();
        this.#type=type;
        this.#key=key;
        this.#version = version || null;

        this.existsDelay = [0,0];
        this.versionDelay = [0,0];
    }

    get type()
    {
        return this.#type;
    }

    get exists()
    {
        return delayedPromise(() => !!this.#version, ...this.existsDelay);
    }

    get version()
    {
        return delayedPromise(() => this.#version, ...this.versionDelay);
    }

    get identity()
    {
        return this.#key;
    }
}