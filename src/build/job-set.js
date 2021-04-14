var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var _jobs, _promise;
export class JobSet {
    constructor(...jobs) {
        _jobs.set(this, {});
        _promise.set(this, null);
        for (let job of jobs || [])
            this.add(job);
    }
    async run() {
        return await (__classPrivateFieldGet(this, _promise) ||
            (__classPrivateFieldSet(this, _promise, this.createRunPromise())));
    }
    createRunPromise() {
        return Promise.all(Object.values(__classPrivateFieldGet(this, _jobs)).map(async (job) => {
            await job.run();
        }));
    }
    add(...jobs) {
        for (let job of jobs) {
            const key = job.rule.key;
            if (key in __classPrivateFieldGet(this, _jobs) && __classPrivateFieldGet(this, _jobs)[key] !== job) {
                throw new Error("Attempt to add a different job object for the same rule to a job set");
            }
            __classPrivateFieldGet(this, _jobs)[key] = job;
        }
    }
    union(jobSet) {
        return new JobSet(...this.jobs, ...(jobSet?.jobs ?? []));
    }
    difference(jobSet) {
        const result = new JobSet(...this.jobs);
        for (let key of Object.keys(jobSet ? __classPrivateFieldGet(jobSet, _jobs) : {}))
            if (key in __classPrivateFieldGet(result, _jobs))
                delete __classPrivateFieldGet(result, _jobs)[key];
        return result;
    }
    get jobs() {
        return Object.values(__classPrivateFieldGet(this, _jobs));
    }
    get job() {
        return this.jobs[0];
    }
}
_jobs = new WeakMap(), _promise = new WeakMap();
//# sourceMappingURL=job-set.js.map