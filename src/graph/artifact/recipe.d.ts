import { AID, Artifact, ArtifactFactory, ArtifactManager, ArtifactResolver } from "../artifact.js";
import { Rule } from "../rule.js";
import { Job } from "../../build/job.js";
import { Project } from "../../project.js";
export declare class RecipeArtifact extends Artifact {
    #private;
    readonly job: Job;
    rm(): Promise<void>;
    constructor(aid: Artifact.Reference, job: Job);
    get exists(): Promise<boolean>;
    get spec(): Promise<Object>;
    get version(): Promise<string>;
    static makeFor(job: Job): RecipeArtifact;
}
export declare class RecipeArtifactResolver extends ArtifactResolver {
    resolveToExternalIdentifier(aid: AID): string;
    get type(): string;
}
export declare class RecipeArtifactFactory extends ArtifactFactory {
    #private;
    constructor(manager: ArtifactManager, project: Project);
    prependRequiredConstructorArgs(ref: Artifact.Reference, extraArgs: any[]): [Rule, ...any];
    private resolveRule;
}
//# sourceMappingURL=recipe.d.ts.map