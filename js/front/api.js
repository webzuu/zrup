import { Build } from "../build.js";
import { Job } from "../build/job.js";
import { JobSet } from "../build/job-set.js";
import { NopRecipe, Recipe } from "../build/recipe.js";
import { CommandRecipe } from "../build/recipe/command.js";
import { DelayedRecipe } from "../build/recipe/delayed.js";
import { WrapperRecipe } from "../build/recipe/wrapper.js";
import { Db } from "../db.js";
import { AID, Artifact, ArtifactFactory, ArtifactManager } from "../graph/artifact.js";
import { FileArtifact, FileArtifactFactory, FileArtifactResolver } from "../graph/artifact/file.js";
import { MockArtifact, MockFileFactory } from "../graph/artifact/mock.js";
import { RecipeArtifact, RecipeArtifactFactory, RecipeArtifactResolver } from "../graph/artifact/recipe.js";
import { Dependency } from "../graph/dependency.js";
import { Rule } from "../graph/rule.js";
import { resolveArtifacts } from "../module.js";
import { ModuleBuilder } from "./module-builder.js";
import { RuleBuilder } from "./rule-builder.js";
import { Zrup } from "./zrup.js";
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