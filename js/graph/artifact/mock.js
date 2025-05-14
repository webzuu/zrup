import { AID, Artifact, ArtifactFactory } from "../artifact.js";
import { FileArtifactFactory, FileArtifactResolver } from "./file.js";
export class MockArtifact extends Artifact {
    constructor(ref, type, pk) {
        super(new AID(ref + '').withType(type).toString());
        this.$pk = pk;
        this.$type = type || 'file';
    }
    get type() {
        return this.$type;
    }
    get exists() {
        return this.$pk.about(this.key, "exists").promise;
    }
    get version() {
        return this.$pk.about(this.key, "version").promise;
    }
    async getContents() {
        return await this.$pk.about(this.key, "contents").promise;
    }
    async putContents(contents) {
        this.$pk.set(this.key, "contents", contents);
    }
    async rm() {
        this.$pk.forget(this.key, "exists");
        this.$pk.forget(this.key, "version");
        this.$pk.forget(this.key, "contents");
        this.$pk.set(this.key, "exists", false);
        this.$pk.set(this.key, "version", Artifact.NONEXISTENT_VERSION);
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
export class MockFileFactory extends ArtifactFactory {
    constructor(manager, project, pk) {
        super(manager, MockArtifact, new FileArtifactResolver(project), "file");
        this.$project = project;
        this.$pk = pk;
    }
    prependRequiredConstructorArgs(aid, extraArgs) {
        return [MockFileFactory.type, this.$pk, ...super.prependRequiredConstructorArgs(aid, extraArgs)];
    }
    static get type() { return "file"; }
    ;
}
Object.assign(MockFileFactory.prototype, {
    normalize: FileArtifactFactory.prototype.normalize
});
//# sourceMappingURL=mock.js.map