import {Artifact} from "../artifact.js";

import hash from "object-hash";
import {UnsupportedOperation} from "../../error/unsupported-operation.js";

export class ArtifactList extends Artifact {

    #items : Artifact[];

    constructor(identity: string)
    {
        super(identity);
        this.#items = [];
    }

    get type()
    {
        return "artifact-list";
    }

    get items(): Artifact[]
    {
        return this.#items.slice();
    }

    set items(items: Artifact[])
    {
        this.#items = items;
    }

    get version()
    {
        return this.computeVersion();
    }

    private async computeVersion() {
        const itemVersions : Record<string,string> = {};
        await Promise.all(
            this.items.map(async (_ : Artifact) => { itemVersions[_.key] = await _.version })
        );
        return hash.MD5(itemVersions);
    }

    get exists() {
        return Promise.resolve(false);
    }

    rm(): Promise<void> {
        throw new UnsupportedOperation('ArtifactList','rm');
    }
}