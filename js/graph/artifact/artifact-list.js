import { Artifact } from "../artifact.js";
import { UnsupportedOperation } from "../../error/unsupported-operation.js";
export class ArtifactList extends Artifact {
    constructor(identity) {
        super(identity);
        this.$versionCache = new Map();
        this.$items = [];
    }
    get type() {
        return "artifact-list";
    }
    get items() {
        return this.$items.slice();
    }
    set items(items) {
        this.$items = items;
        this.$versionCache.clear();
    }
    get version() {
        if (!Artifact.hashService) {
            throw new Error("HashService not initialized. Call Artifact.setHashService() first.");
        }
        return this.getVersionUsing(Artifact.hashService.algorithm);
    }
    set version(versionPromise) {
        if (!Artifact.hashService) {
            throw new Error("HashService not initialized. Call Artifact.setHashService() first.");
        }
        this.$versionCache.clear();
        this.$versionCache.set(Artifact.hashService.algorithm, versionPromise);
    }
    getVersionUsing(algorithm) {
        const cached = this.$versionCache.get(algorithm);
        if (cached)
            return cached;
        const promise = this.computeVersion(algorithm);
        this.$versionCache.set(algorithm, promise);
        return promise;
    }
    async computeVersion(algorithm) {
        const itemVersions = {};
        await Promise.all(this.items.map(async (_) => {
            itemVersions[_.key] = await _.getVersionUsing(algorithm);
        }));
        // Hash the JSON representation of item versions using configured algorithm
        return Artifact.hashService.hashObject(itemVersions, algorithm);
    }
    get exists() {
        return Promise.resolve(false);
    }
    rm() {
        throw new UnsupportedOperation('ArtifactList', 'rm');
    }
}
//# sourceMappingURL=artifact-list.js.map