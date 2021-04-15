import { Module } from "../module.js";
import { Dependency } from "./dependency.js";
import { Artifact } from "./artifact.js";
import { Recipe } from "../build/recipe.js";
export declare class Rule {
    #private;
    outputs: Record<string, Artifact>;
    dependencies: Record<string, Dependency>;
    also: Record<string, Rule>;
    after: Record<string, Rule>;
    always: boolean;
    constructor(module: Module, name: string);
    get module(): Module;
    get name(): string;
    get identity(): string;
    get recipe(): Recipe | null;
    get validRecipe(): Recipe;
    set recipe(recipe: Recipe | null);
    static computeKey(identityString: string): string;
    get key(): string;
    set label(label: string | null);
    get label(): string | null;
    formatDefaultLabel(): string;
    addDependency(artifact: Artifact, whenAbsent: Dependency.Absent): Dependency;
    addAlso(rule: Rule): void;
    addOutput(artifact: Artifact): Artifact;
}
//# sourceMappingURL=rule.d.ts.map