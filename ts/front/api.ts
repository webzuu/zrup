import { Build } from "../build";
import { Job } from "../build/job";
import { JobSet } from "../build/job-set";
import {NopRecipe, Recipe } from "../build/recipe";
import { CommandRecipe } from "../build/recipe/command";
import { DelayedRecipe } from "../build/recipe/delayed";
import { WrapperRecipe } from "../build/recipe/wrapper";
import { Db } from "../db";
import {AID, Artifact, ArtifactFactory, ArtifactManager } from "../graph/artifact";
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