import {Artifact} from "../artifact.js";

import hash from "object-hash";
import {UnsupportedOperation} from "../../error/unsupported-operation.js";

export class ArtifactList extends Artifact {

    private $items : Artifact[];
    private $versionCache : Map<string, {fromBuilt: boolean, version: Promise<string>}> = new Map();

    constructor(identity: string)
    {
        super(identity);
        this.$items = [];
    }

    get type()
    {
        return "artifact-list";
    }

    get items(): Artifact[]
    {
        return this.$items.slice();
    }

    set items(items: Artifact[])
    {
        this.$items = items;
        this.$versionCache.clear();
    }

    get version()
    {
        if (!Artifact.hashService) {
            throw new Error("HashService not initialized. Call Artifact.setHashService() first.");
        }
        return this.getVersionUsing(Artifact.hashService.algorithm);
    }

    set version(versionPromise: Promise<string>) {
        if (!Artifact.hashService) {
            throw new Error("HashService not initialized. Call Artifact.setHashService() first.");
        }
        this.$versionCache.clear();
        this.$versionCache.set(Artifact.hashService.algorithm, {
            fromBuilt: this.built,
            version: versionPromise
        });
    }

    getVersionUsing(algorithm: string): Promise<string> {
        const cached = this.$versionCache.get(algorithm);
        if (cached && cached.fromBuilt === this.built) {
            return cached.version;
        }

        const promise = this.computeVersion(algorithm);
        this.$versionCache.set(algorithm, {
            fromBuilt: this.built,
            version: promise
        });
        return promise;
    }

    private async computeVersion(algorithm: string) {
        const itemVersions : Record<string,string> = {};
        await Promise.all(
            this.items.map(async (_ : Artifact) => {
                itemVersions[_.key] = await _.getVersionUsing(algorithm);
            })
        );
        // Hash the JSON representation of item versions using configured algorithm
        return await Artifact.hashService.hashObject(itemVersions, algorithm as any);
    }

    get exists() {
        return Promise.resolve(false);
    }

    rm(): Promise<void> {
        throw new UnsupportedOperation('ArtifactList','rm');
    }
}