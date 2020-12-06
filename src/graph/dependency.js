export default class Dependency
{
    /** @type {Artifact} */
    #artifact;
    /** @type {number} */
    #whenAbsent;

    /**
     * @param {Artifact} artifact
     * @param {number} [whenAbsent]
     */
    constructor(artifact,whenAbsent)
    {
        this.#artifact = artifact;
        this.#whenAbsent = ("undefined" === typeof whenAbsent) ? Dependency.ABSENT_VIOLATION : whenAbsent;
    }

    get artifact() { return this.#artifact; }
    get whenAbsent() { return this.#whenAbsent; }

    static get ABSENT_VIOLATION() { return 0; }
    static get ABSENT_STATE() { return 1; }
}