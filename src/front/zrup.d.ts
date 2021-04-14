import type { HyperVal } from 'hyperval';
import { JobSet } from "../build/job-set.js";
import { Job } from "../build/job.js";
import { NopRecipe, Recipe } from "../build/recipe.js";
import { CommandRecipe } from "../build/recipe/command.js";
import { DelayedRecipe } from "../build/recipe/delayed.js";
import { WrapperRecipe } from "../build/recipe/wrapper.js";
import { MockArtifact, MockFileFactory } from "../graph/artifact/mock.js";
import { RecipeArtifact, RecipeArtifactFactory, RecipeArtifactResolver } from "../graph/artifact/recipe.js";
import { Db } from "../db.js";
import { AID, Artifact, ArtifactFactory, ArtifactManager } from "../graph/artifact.js";
import { FileArtifact, FileArtifactFactory, FileArtifactResolver } from "../graph/artifact/file.js";
import { RuleBuilder } from "./rule-builder.js";
import { ModuleBuilder } from "./module-builder.js";
import { Build } from "../build.js";
import { resolveArtifacts } from "../module.js";
import { Rule } from "../graph/rule.js";
import Config = Zrup.Config;
import { Dependency } from "../graph/dependency.js";
/***/
export declare class Zrup {
    #private;
    constructor(projectRoot: string, config: Zrup.Config, request: Zrup.Request);
    run(): Promise<void>;
    static init(absDirectory: string): Promise<void>;
    static loadConfig(fromWhere: string): Promise<Config>;
    static locateRoot(cwd: string): Promise<string>;
}
declare const schema_Config: import("hyperval").HyperObject<{
    zrupDir: import("hyperval").Hyper<string, string>;
    dataDir: import("hyperval").Hyper<string, string>;
    channels: import("hyperval").HyperRecord<import("hyperval").Hyper<string, string>, import("hyperval").Hyper<string, string>>;
}>, schema_RequestOptions: import("hyperval").HyperObject<{
    version: import("hyperval").Hyper<string, string>;
    init: import("hyperval").HyperOptional<import("hyperval").Hyper<boolean, boolean>>;
    verbose: import("hyperval").HyperOptional<import("hyperval").Hyper<boolean, boolean>>;
}>, schema_Request: import("hyperval").HyperObject<{
    goals: import("hyperval").HyperArray<import("hyperval").Hyper<string, string>>;
    options: import("hyperval").HyperObject<{
        version: import("hyperval").Hyper<string, string>;
        init: import("hyperval").HyperOptional<import("hyperval").Hyper<boolean, boolean>>;
        verbose: import("hyperval").HyperOptional<import("hyperval").Hyper<boolean, boolean>>;
    }>;
}>, schema_Options: import("hyperval").HyperObject<{
    goals: import("hyperval").HyperArray<import("hyperval").Hyper<string, string>>;
}>;
export declare namespace Zrup {
    type Config = HyperVal<typeof schema_Config>;
    type RequestOptions = HyperVal<typeof schema_RequestOptions>;
    type Request = HyperVal<typeof schema_Request>;
    type Options = HyperVal<typeof schema_Options>;
    const Schema: {
        Config: typeof schema_Config;
        RequestOptions: typeof schema_RequestOptions;
        Request: typeof schema_Request;
        Options: typeof schema_Options;
    };
}
export declare class ZrupAPI {
    Artifact: typeof Artifact;
    AID: typeof AID;
    FileArtifact: typeof FileArtifact;
    RecipeArtifact: typeof RecipeArtifact;
    MockArtifact: typeof MockArtifact;
    Dependency: typeof Dependency;
    ArtifactManager: typeof ArtifactManager;
    ArtifactFactory: typeof ArtifactFactory;
    FileArtifactFactory: typeof FileArtifactFactory;
    FileArtifactResolver: typeof FileArtifactResolver;
    RecipeArtifactFactory: typeof RecipeArtifactFactory;
    RecipeArtifactResolver: typeof RecipeArtifactResolver;
    MockFileFactory: typeof MockFileFactory;
    Db: typeof Db;
    Build: typeof Build;
    Job: typeof Job;
    JobSet: typeof JobSet;
    Rule: typeof Rule;
    Recipe: typeof Recipe;
    NopRecipe: typeof NopRecipe;
    CommandRecipe: typeof CommandRecipe;
    WrapperRecipe: typeof WrapperRecipe;
    DelayedRecipe: typeof DelayedRecipe;
    ModuleBuilder: typeof ModuleBuilder;
    RuleBuilder: typeof RuleBuilder;
    Zrup: typeof Zrup;
    resolveArtifacts: typeof resolveArtifacts;
}
export {};
//# sourceMappingURL=zrup.d.ts.map