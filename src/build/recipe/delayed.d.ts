import { Recipe } from "../recipe.js";
import { Job } from "../job.js";
export declare namespace DelayedRecipe {
    type Parameters = {
        recipe?: Recipe;
        delay_milliseconds?: number;
    };
    type Spec = Required<Parameters> & {
        recipeSpec: Record<string, any>;
        recipeHash: string;
    };
    type SpecDescriptor = {
        recipe: string;
        delay_milliseconds: number;
    };
}
export declare class DelayedRecipe extends Recipe {
    #private;
    constructor(recipe: Recipe, delay_milliseconds: number);
    concretizeSpecFor(job: Job): Promise<DelayedRecipe.Spec>;
    describeSpec(spec: DelayedRecipe.Spec): DelayedRecipe.SpecDescriptor;
    executeFor(job: Job, spec: DelayedRecipe.Spec): Promise<void>;
}
//# sourceMappingURL=delayed.d.ts.map