import { Job } from "./job.js";
export declare abstract class Recipe {
    abstract concretizeSpecFor(job: Job): Promise<Object>;
    abstract executeFor(job: Job, spec: Object): Promise<void>;
    hashSpec(spec: Record<string, any>): Promise<string>;
    protected describeSpec(spec: Object): Object;
    get consoleOutput(): string;
}
export declare class NopRecipe extends Recipe {
    executeFor(job: Job, spec: Object): Promise<void>;
    concretizeSpecFor(job: Job): Promise<Object>;
}
//# sourceMappingURL=recipe.d.ts.map