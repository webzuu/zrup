import { Build } from "../build.js";
import { Job } from "../build/job.js";
import { JobSet } from "../build/job-set.js";
import {NopRecipe, Recipe } from "../build/recipe.js";
import { CommandRecipe } from "../build/recipe/command.js";
import { DelayedRecipe } from "../build/recipe/delayed.js";
import { WrapperRecipe } from "../build/recipe/wrapper.js";
import { Db } from "../db.js";
import {AID, Artifact, ArtifactFactory, ArtifactManager } from "../graph/artifact.js";
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
    Artifact = Artifact;
    AID = AID;
    FileArtifact = FileArtifact;
    RecipeArtifact = RecipeArtifact;
    MockArtifact = MockArtifact;

    Dependency = Dependency;

    ArtifactManager = ArtifactManager;

    ArtifactFactory = ArtifactFactory;
    FileArtifactFactory = FileArtifactFactory;
    FileArtifactResolver = FileArtifactResolver;
    RecipeArtifactFactory = RecipeArtifactFactory;
    RecipeArtifactResolver = RecipeArtifactResolver;
    MockFileFactory = MockFileFactory;

    Db = Db;

    Build = Build;
    Job = Job;
    JobSet = JobSet;
    Rule = Rule;
    Recipe = Recipe;
    NopRecipe = NopRecipe;
    CommandRecipe = CommandRecipe;
    WrapperRecipe = WrapperRecipe;
    DelayedRecipe = DelayedRecipe;

    ModuleBuilder = ModuleBuilder;
    RuleBuilder = RuleBuilder;
    Zrup = Zrup;
    resolveArtifacts = resolveArtifacts;
}