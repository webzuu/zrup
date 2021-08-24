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
var _MockArtifact_pk, _MockArtifact_type, _MockFileFactory_project, _MockFileFactory_pk;
import { AID, Artifact, ArtifactFactory } from "../artifact.js";
import { FileArtifactFactory, FileArtifactResolver } from "./file.js";
export class MockArtifact extends Artifact {
    constructor(ref, type, pk) {
        super(new AID(ref + '').withType(type).toString());
        _MockArtifact_pk.set(this, void 0);
        _MockArtifact_type.set(this, void 0);
        __classPrivateFieldSet(this, _MockArtifact_pk, pk, "f");
        __classPrivateFieldSet(this, _MockArtifact_type, type || 'file', "f");
    }
    get type() {
        return __classPrivateFieldGet(this, _MockArtifact_type, "f");
    }
    get exists() {
        return __classPrivateFieldGet(this, _MockArtifact_pk, "f").about(this.key, "exists").promise;
    }
    get version() {
        return __classPrivateFieldGet(this, _MockArtifact_pk, "f").about(this.key, "version").promise;
    }
    async getContents() {
        return await __classPrivateFieldGet(this, _MockArtifact_pk, "f").about(this.key, "contents").promise;
    }
    async putContents(contents) {
        __classPrivateFieldGet(this, _MockArtifact_pk, "f").set(this.key, "contents", contents);
    }
    async rm() {
        __classPrivateFieldGet(this, _MockArtifact_pk, "f").forget(this.key, "exists");
        __classPrivateFieldGet(this, _MockArtifact_pk, "f").forget(this.key, "version");
        __classPrivateFieldGet(this, _MockArtifact_pk, "f").forget(this.key, "contents");
        __classPrivateFieldGet(this, _MockArtifact_pk, "f").set(this.key, "exists", false);
        __classPrivateFieldGet(this, _MockArtifact_pk, "f").set(this.key, "version", Artifact.NONEXISTENT_VERSION);
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
_MockArtifact_pk = new WeakMap(), _MockArtifact_type = new WeakMap();
export class MockFileFactory extends ArtifactFactory {
    constructor(manager, project, pk) {
        super(manager, MockArtifact, new FileArtifactResolver(project), "file");
        _MockFileFactory_project.set(this, void 0);
        _MockFileFactory_pk.set(this, void 0);
        __classPrivateFieldSet(this, _MockFileFactory_project, project, "f");
        __classPrivateFieldSet(this, _MockFileFactory_pk, pk, "f");
    }
    prependRequiredConstructorArgs(aid, extraArgs) {
        return [MockFileFactory.type, __classPrivateFieldGet(this, _MockFileFactory_pk, "f"), ...super.prependRequiredConstructorArgs(aid, extraArgs)];
    }
    static get type() { return "file"; }
    ;
}
_MockFileFactory_project = new WeakMap(), _MockFileFactory_pk = new WeakMap();
Object.assign(MockFileFactory.prototype, {
    normalize: FileArtifactFactory.prototype.normalize
});
//# sourceMappingURL=mock.js.map