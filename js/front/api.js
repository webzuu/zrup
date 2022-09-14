import { Build } from "../build";
import { Job } from "../build/job";
import { JobSet } from "../build/job-set";
import { NopRecipe, Recipe } from "../build/recipe";
import { CommandRecipe } from "../build/recipe/command";
import { DelayedRecipe } from "../build/recipe/delayed";
import { WrapperRecipe } from "../build/recipe/wrapper";
import { Db } from "../db";
import { AID, Artifact, ArtifactFactory, ArtifactManager } from "../graph/artifact";
import { FileArtifact, FileArtifactFactory, FileArtifactResolver } from "../graph/artifact/file";
import { MockArtifact, MockFileFactory } from "../graph/artifact/mock";
import { RecipeArtifact, RecipeArtifactFactory, RecipeArtifactResolver } from "../graph/artifact/recipe";
import { Dependency } from "../graph/dependency";
import { Rule } from "../graph/rule";
import { resolveArtifacts } from "../module";
import { ModuleBuilder } from "./module-builder";
import { RuleBuilder } from "./rule-builder";
import { Zrup } from "./zrup";
export class ZrupAPI {
    constructor() {
        this.Artifact = Artifact;
        this.AID = AID;
        this.FileArtifact = FileArtifact;
        this.RecipeArtifact = RecipeArtifact;
        this.MockArtifact = MockArtifact;
        this.Dependency = Dependency;
        this.ArtifactManager = ArtifactManager;
        this.ArtifactFactory = ArtifactFactory;
        this.FileArtifactFactory = FileArtifactFactory;
        this.FileArtifactResolver = FileArtifactResolver;
        this.RecipeArtifactFactory = RecipeArtifactFactory;
        this.RecipeArtifactResolver = RecipeArtifactResolver;
        this.MockFileFactory = MockFileFactory;
        this.Db = Db;
        this.Build = Build;
        this.Job = Job;
        this.JobSet = JobSet;
        this.Rule = Rule;
        this.Recipe = Recipe;
        this.NopRecipe = NopRecipe;
        this.CommandRecipe = CommandRecipe;
        this.WrapperRecipe = WrapperRecipe;
        this.DelayedRecipe = DelayedRecipe;
        this.ModuleBuilder = ModuleBuilder;
        this.RuleBuilder = RuleBuilder;
        this.Zrup = Zrup;
        this.resolveArtifacts = resolveArtifacts;
    }
}
//# sourceMappingURL=api.js.map