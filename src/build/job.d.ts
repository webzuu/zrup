import { RecipeArtifact } from "../graph/artifact/recipe.js";
import { Dependency } from "../graph/dependency.js";
import { Build } from "../build.js";
import { Artifact } from "../graph/artifact.js";
import { Rule } from "../graph/rule.js";
import { ArtifactRecord } from "../db.js";
declare type VersionFileListEntry = [string, string];
/**
 *
 */
export declare class Job {
    #private;
    readonly build: Build;
    readonly rule: Rule;
    recipeInvoked: boolean;
    recipeArtifact: RecipeArtifact;
    promise: Promise<this> | null;
    finished: boolean;
    outputs: Artifact[];
    dynamicOutputs: Artifact[];
    error: Error | null;
    requestedBy: Job | null;
    dependencies: Dependency[];
    recordedDependencies: Dependency[];
    constructor(build: Build, rule: Rule);
    run(): Promise<this>;
    private guardedWork;
    private also;
    /**
     * The main build algorithm
     */
    private work;
    verifyBuiltDependency: (dependency: Dependency) => Promise<void>;
    private getPrerequisiteRuleKeysToDependencyType;
    /**
     * @returns {Promise<JobSet>}
     */
    private getPrerequisiteJobSet;
    private getMergedDependencies;
    prepare(): void;
    detectRewritesAfterUse(): Promise<void>;
    detectRewriteAfterUse(outputArtifact: Artifact): Promise<string | null>;
    collectDependencies(): void;
    artifactFromRecord(record: ArtifactRecord): Artifact;
    get artifacts(): Artifact[];
    preCollectOutputs(): void;
    readAutoDependenciesFile(ref: Artifact.Reference): Promise<object[]>;
    readAutoOutputsFile(ref: Artifact.Reference): Promise<object[]>;
    readVersionFileList(ref: Artifact.Reference, artifactType?: string): Promise<VersionFileListEntry[]>;
}
export {};
//# sourceMappingURL=job.d.ts.map