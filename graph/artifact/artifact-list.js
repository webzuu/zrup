import {Artifact} from "../artifact.js";
import md5 from "md5";

export const ArtifactList = class ArtifactList extends Artifact

{
    /**
     * @type {Artifact[]}
     */
    #items;
    /**
     * @type {string}
     */
    #identity;

    /**
     * @param {string} identity
     */
    constructor(identity)
    {
        super();
        this.#identity = identity;
        this.#items = [];
    }

    get type()
    {
        return "artifact-list";
    }

    get identity()
    {
        return this.#identity;
    }

    get items() { return this.#items; }

    /**
     * @param {Artifact[]} items
     */
    set items(items) { this.#items = items; }

    get version()
    {
        return this.#computeVersion();
    }

    async #computeVersion()
    {
        const itemVersions =
            await Promise.all(this.#items
                .slice()
                .sort((lhs, rhs) => lhs.key.localeCompare(rhs.key))
                .map(_ => (async () => [["key",_.key],["version",await _.version]])())
            );
        return md5(JSON.stringify(itemVersions));
    }
}