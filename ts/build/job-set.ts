import {Job} from "./job.js";

export class JobSet {

    #jobs : Record<string, Job> = {};
    #promise : Promise<void[]> | null = null;

    constructor(...jobs : Job[])
    {
        for(let job of jobs || []) this.add(job);
    }

    async run() : Promise<void[]>
    {
        return await (
            this.#promise
            ||
            (this.#promise = this.createRunPromise())
        );
    }

    private createRunPromise(): Promise<void[]>
    {
        return Promise.all(Object.values(this.#jobs).map(
            async job => {
                await job.run();
            }));
    }

    private add(...jobs : Job[]) {
        for(let job of jobs) {
            const key = job.rule.key;
            if (key in this.#jobs && this.#jobs[key] !== job) {
                throw new Error("Attempt to add a different job object for the same rule to a job set");
            }
            this.#jobs[key] = job;
        }
    }

    union(jobSet?: JobSet|null): JobSet
    {
        return new JobSet(...this.jobs, ...(jobSet?.jobs ?? []))
    }

    difference(jobSet?: JobSet|null) : JobSet|null|undefined
    {
        const result = new JobSet(...this.jobs);
        for(let key of Object.keys(jobSet ? jobSet.#jobs : {})) if (key in result.#jobs) delete result.#jobs[key];
        return result;
    }

    get jobs(): Job[]
    {
        return Object.values(this.#jobs);
    }

    get job(): Job | undefined
    {
        return this.jobs[0];
    }
}