import { Job } from "./job.js";
export declare class JobSet {
    #private;
    constructor(...jobs: Job[]);
    run(): Promise<void[]>;
    private createRunPromise;
    private add;
    union(jobSet?: JobSet | null): JobSet;
    difference(jobSet?: JobSet | null): JobSet | null | undefined;
    get jobs(): Job[];
    get job(): Job | undefined;
}
//# sourceMappingURL=job-set.d.ts.map