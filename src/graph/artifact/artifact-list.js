var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _items;
import { Artifact } from "../artifact.js";
import hash from "object-hash";
import { UnsupportedOperation } from "../../error/unsupported-operation";
export class ArtifactList extends Artifact {
    constructor(identity) {
        super(identity);
        _items.set(this, void 0);
        __classPrivateFieldSet(this, _items, []);
    }
    get type() {
        return "artifact-list";
    }
    get items() {
        return __classPrivateFieldGet(this, _items).slice();
    }
    set items(items) {
        __classPrivateFieldSet(this, _items, items);
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
_items = new WeakMap();
//# sourceMappingURL=artifact-list.js.map