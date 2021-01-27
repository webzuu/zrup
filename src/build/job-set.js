import {Job} from "./job.js";

export const JobSet = class JobSet {

    /** @type {Object.<string,Job>} */
    #jobs = {};
    #promise = null;

    /** @param {...Job} [jobs] */
    constructor(...jobs)
    {
        for(let job of jobs || []) this.#add(job);
    }

    /** @return {Promise<void>} */
    async run()
    {
        return await (
            this.#promise
            ||
            (this.#promise = this.#createRunPromise())
        );
    }

    #createRunPromise()
    {
        return Promise.all(Object.values(this.#jobs).map(
            async job => {
                await job.run();
            }));
    }

    /**
     * @param {...Job} jobs
     */
    #add(...jobs) {
        for(let job of jobs) {
            const key = job.rule.key;
            if (key in this.#jobs && this.#jobs[key] !== job) {
                throw new Error("Attempt to add a different job object for the same rule to a job set");
            }
            this.#jobs[key] = job;
        }
    }

    /**
     * @param {JobSet} jobSet
     * @return {JobSet}
     */
    union(jobSet)
    {
        return new JobSet(...this.jobs, ...jobSet.jobs)
    }

    difference(jobSet)
    {
        const result = new JobSet(...this.jobs);
        for(let key of Object.keys(jobSet.#jobs)) if (key in result.#jobs) delete result.#jobs[key];
        return result;
    }

    /** @return {Job[]} */
    get jobs()
    {
        return Object.values(this.#jobs);
    }

    /** @return {Job} */
    get job()
    {
        return this.jobs[0];
    }
}