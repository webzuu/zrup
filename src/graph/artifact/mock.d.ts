import { Artifact, ArtifactManager, ArtifactFactory } from "../artifact.js";
import { PromiseKeeper } from "../../util/promise-keeper.js";
import { Project } from "../../project.js";
export declare class MockArtifact extends Artifact {
    #private;
    constructor(ref: Artifact.Reference, type: string | undefined, pk: PromiseKeeper);
    get type(): string;
    get exists(): Promise<boolean>;
    get version(): Promise<string>;
    getContents(): Promise<string>;
    putContents(contents: string): Promise<void>;
    rm(): Promise<void>;
    get caps(): {
        canWrite: boolean;
        canRemove: boolean;
        canBuild: boolean;
    };
    static get type(): string;
    static get constructorOfThisClass(): typeof MockArtifact;
}
export declare class MockFileFactory extends ArtifactFactory {
    #private;
    constructor(manager: ArtifactManager, project: Project, pk: PromiseKeeper);
    prependRequiredConstructorArgs(aid: Artifact.Reference, extraArgs: any[]): any[];
    static get type(): string;
}
//# sourceMappingURL=mock.d.ts.map