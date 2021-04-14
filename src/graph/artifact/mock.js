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
var _pk, _type, _project, _pk_1;
import { AID, Artifact, ArtifactFactory } from "../artifact.js";
import { FileArtifactFactory, FileArtifactResolver } from "./file.js";
export class MockArtifact extends Artifact {
    constructor(ref, type, pk) {
        super(new AID(ref + '').withType(type).toString());
        _pk.set(this, void 0);
        _type.set(this, void 0);
        __classPrivateFieldSet(this, _pk, pk);
        __classPrivateFieldSet(this, _type, type || 'file');
    }
    get type() {
        return __classPrivateFieldGet(this, _type);
    }
    get exists() {
        return __classPrivateFieldGet(this, _pk).about(this.key, "exists").promise;
    }
    get version() {
        return __classPrivateFieldGet(this, _pk).about(this.key, "version").promise;
    }
    async getContents() {
        return await __classPrivateFieldGet(this, _pk).about(this.key, "contents").promise;
    }
    async putContents(contents) {
        __classPrivateFieldGet(this, _pk).set(this.key, "contents", contents);
    }
    async rm() {
        __classPrivateFieldGet(this, _pk).forget(this.key, "exists");
        __classPrivateFieldGet(this, _pk).forget(this.key, "version");
        __classPrivateFieldGet(this, _pk).forget(this.key, "contents");
        __classPrivateFieldGet(this, _pk).set(this.key, "exists", false);
        __classPrivateFieldGet(this, _pk).set(this.key, "version", Artifact.NONEXISTENT_VERSION);
    }
    get caps() {
        return {
            canWrite: true,
            canRemove: true,
            canBuild: true
        };
    }
    static get type() {
        throw new Error("MockArtifact has dynamic artifact type. If you are trying to subclass ArtifactFactory to make instances"
            + " of MockArtifact mocking a specific type, you need to override the type property on the factory" +
            +" class constructor");
    }
    static get constructorOfThisClass() { return this; }
}
_pk = new WeakMap(), _type = new WeakMap();
export class MockFileFactory extends ArtifactFactory {
    constructor(manager, project, pk) {
        super(manager, MockArtifact, new FileArtifactResolver(project), "file");
        _project.set(this, void 0);
        _pk_1.set(this, void 0);
        __classPrivateFieldSet(this, _project, project);
        __classPrivateFieldSet(this, _pk_1, pk);
    }
    prependRequiredConstructorArgs(aid, extraArgs) {
        return [MockFileFactory.type, __classPrivateFieldGet(this, _pk_1), ...super.prependRequiredConstructorArgs(aid, extraArgs)];
    }
    static get type() { return "file"; }
    ;
}
_project = new WeakMap(), _pk_1 = new WeakMap();
Object.assign(MockFileFactory.prototype, {
    normalize: FileArtifactFactory.prototype.normalize
});
//# sourceMappingURL=mock.js.map