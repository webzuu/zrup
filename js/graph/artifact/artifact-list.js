import { Artifact } from "../artifact.js";
import hash from "object-hash";
import { UnsupportedOperation } from "../../error/unsupported-operation.js";
export class ArtifactList extends Artifact {
    constructor(identity) {
        super(identity);
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
    }
    get version() {
        return this.computeVersion();
    }
    async computeVersion() {
        const itemVersions = {};
        await Promise.all(this.items.map(async (_) => { itemVersions[_.key] = await _.version; }));
        return hash.MD5(itemVersions);
    }
    get exists() {
        return Promise.resolve(false);
    }
    rm() {
        throw new UnsupportedOperation('ArtifactList', 'rm');
    }
}
//# sourceMappingURL=artifact-list.js.map