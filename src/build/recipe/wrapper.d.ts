export declare namespace WrapperRecipe {
    type Described = {
        descriptor?: string;
    };
    type parachronousCallback = Described & ((job: Job) => Promise<void>);
    type aroundCallback = Described & ((job: Job, proceed: parachronousCallback) => Promise<void> & Described);
    type Parameters = {
        recipe?: Recipe;
        before?: parachronousCallback;
        around?: aroundCallback;
        after?: parachronousCallback;
    };
    type Spec = Required<Parameters> & {
        recipeSpec: Record<string, any>;
        recipeHash: string;
    };
    type SpecDescription = {
        recipe: string;
        before: string;
        around: string;
        after: string;
    };
}
import { Recipe } from "../recipe.js";
import { Job } from "../job.js";
/***/
export declare class WrapperRecipe extends Recipe {
    #private;
    constructor(params: WrapperRecipe.Parameters);
    concretizeSpecFor(job: Job): Promise<WrapperRecipe.Spec>;
    describeSpec(spec: WrapperRecipe.Spec): WrapperRecipe.SpecDescription;
    executeFor(job: Job, spec: WrapperRecipe.Spec): Promise<void>;
}
//# sourceMappingURL=wrapper.d.ts.map