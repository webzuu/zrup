var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ArtifactList_items;
import { Artifact } from "../artifact.js";
import hash from "object-hash";
import { UnsupportedOperation } from "../../error/unsupported-operation.js";
export class ArtifactList extends Artifact {
    constructor(identity) {
        super(identity);
        _ArtifactList_items.set(this, void 0);
        __classPrivateFieldSet(this, _ArtifactList_items, [], "f");
    }
    get type() {
        return "artifact-list";
    }
    get items() {
        return __classPrivateFieldGet(this, _ArtifactList_items, "f").slice();
    }
    set items(items) {
        __classPrivateFieldSet(this, _ArtifactList_items, items, "f");
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
_ArtifactList_items = new WeakMap();
//# sourceMappingURL=artifact-list.js.map