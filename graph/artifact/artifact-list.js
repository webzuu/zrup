import {Artifact} from "../artifact.js";

import hash from "object-hash";

export const ArtifactList = class ArtifactList extends Artifact

{
    /** @type {Artifact[]} */
    #items;

    /**
     * @param {string} identity
     */
    constructor(identity)
    {
        super(identity);
        this.#items = [];
    }

    get type()
    {
        return "artifact-list";
    }

    /** @return {Artifact[]} */
    get items()
    {
        return this.#items.slice();
    }

    /** @param {Artifact[]} items */
    set items(items)
    {
        this.#items = items;
    }

    get version()
    {
        return this.#computeVersion();
    }

    async #computeVersion()
    {
        const itemVersions = {};
        await Promise.all(
            this.items.map(async (_) => { itemVersions[_.key] = await _.version })
        );
        return hash.MD5(itemVersions);
    }

    get exists() {
        return Promise.resolve(false);
    }
}