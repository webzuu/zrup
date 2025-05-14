import { Job } from "./job.js";
export declare class JobSet {
    private $jobs;
    private $promise;
    constructor(...jobs: Job[]);
    run(): Promise<void[]>;
    private createRunPromise;
    private add;
    union(jobSet?: JobSet | null): JobSet;
    difference(jobSet?: JobSet | null): JobSet | null | undefined;
    get jobs(): Job[];
}
//# sourceMappingURL=job-set.d.ts.map