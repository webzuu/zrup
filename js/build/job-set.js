export class JobSet {
    constructor(...jobs) {
        this.$jobs = {};
        this.$promise = null;
        for (let job of jobs || [])
            this.add(job);
    }
    async run() {
        return await (this.$promise
            ||
                (this.$promise = this.createRunPromise()));
    }
    createRunPromise() {
        return Promise.all(Object.values(this.$jobs).map(async (job) => {
            await job.run();
        }));
    }
    add(...jobs) {
        for (let job of jobs) {
            const key = job.rule.key;
            if (key in this.$jobs && this.$jobs[key] !== job) {
                throw new Error("Attempt to add a different job object for the same rule to a job set");
            }
            this.$jobs[key] = job;
        }
    }
    union(jobSet) {
        return new JobSet(...this.jobs, ...(jobSet?.jobs ?? []));
    }
    difference(jobSet) {
        const result = new JobSet(...this.jobs);
        for (let key of Object.keys(jobSet ? jobSet.$jobs : {}))
            if (key in result.$jobs)
                delete result.$jobs[key];
        return result;
    }
    get jobs() {
        return Object.values(this.$jobs);
    }
    get job() {
        return this.jobs[0];
    }
}
//# sourceMappingURL=job-set.js.map