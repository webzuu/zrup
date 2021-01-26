export class JobSet {

    /** @type {Object.<string,Job>} */
    #jobs = {};
    #promise = null;

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
        return Promise.all(Object.values(this.#jobs).map(job => job.run()));
    }

    /**
     * @param {Job} job
     */
    add(job)
    {
        const key = job.rule.key;
        if (key in this.#jobs && this.#jobs[key] !== job) {
            throw new Error("Attempt to add a different job object for the same rule to a job set");
        }
        this.#jobs[key] = job;
    }

    /**
     * @param {JobSet} jobSet
     */
    merge(jobSet)
    {
        for(let job of Object.values(jobSet.#jobs)) this.add(job);
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