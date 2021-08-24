var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _JobSet_jobs, _JobSet_promise;
export class JobSet {
    constructor(...jobs) {
        _JobSet_jobs.set(this, {});
        _JobSet_promise.set(this, null);
        for (let job of jobs || [])
            this.add(job);
    }
    async run() {
        return await (__classPrivateFieldGet(this, _JobSet_promise, "f")
            ||
                (__classPrivateFieldSet(this, _JobSet_promise, this.createRunPromise(), "f")));
    }
    createRunPromise() {
        return Promise.all(Object.values(__classPrivateFieldGet(this, _JobSet_jobs, "f")).map(async (job) => {
            await job.run();
        }));
    }
    add(...jobs) {
        for (let job of jobs) {
            const key = job.rule.key;
            if (key in __classPrivateFieldGet(this, _JobSet_jobs, "f") && __classPrivateFieldGet(this, _JobSet_jobs, "f")[key] !== job) {
                throw new Error("Attempt to add a different job object for the same rule to a job set");
            }
            __classPrivateFieldGet(this, _JobSet_jobs, "f")[key] = job;
        }
    }
    union(jobSet) {
        return new JobSet(...this.jobs, ...(jobSet?.jobs ?? []));
    }
    difference(jobSet) {
        const result = new JobSet(...this.jobs);
        for (let key of Object.keys(jobSet ? __classPrivateFieldGet(jobSet, _JobSet_jobs, "f") : {}))
            if (key in __classPrivateFieldGet(result, _JobSet_jobs, "f"))
                delete __classPrivateFieldGet(result, _JobSet_jobs, "f")[key];
        return result;
    }
    get jobs() {
        return Object.values(__classPrivateFieldGet(this, _JobSet_jobs, "f"));
    }
    get job() {
        return this.jobs[0];
    }
}
_JobSet_jobs = new WeakMap(), _JobSet_promise = new WeakMap();
//# sourceMappingURL=job-set.js.map