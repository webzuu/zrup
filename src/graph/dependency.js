import {Artifact} from "./artifact.js";

export const Dependency = class Dependency
{
    /** @type {Artifact} */
    #artifact;
    /** @type {number} */
    #whenAbsent;

    /**
     * @param {Artifact} artifact
     * @param {number|undefined} [whenAbsent]
     */
    constructor(artifact,whenAbsent)
    {
        this.#artifact = artifact;
        this.#whenAbsent = ("undefined" === typeof whenAbsent) ? Dependency.ABSENT_VIOLATION : whenAbsent;
    }

    get artifact() { return this.#artifact; }
    get whenAbsent() { return this.#whenAbsent; }

    /**
     * Absence of the artifact depended upon is to be considered an error
     * @return {number}
     * @constructor
     */
    static get ABSENT_VIOLATION() { return 0; }

    /**
     * Absence of the artifact depended upon is to be considered a valid state (version) of that artifact
     * @return {number}
     * @constructor
     */
    static get ABSENT_STATE() { return 1; }
}