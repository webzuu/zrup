
/**
 * @property {Build} build
 * @property {Rule} rule
 * @property {Promise<Job>|null} running
 * @property {boolean} Finished
 * @property {Error} error
 */
class Job {

    constructor(build, rule) {
        this.build = build;
        this.rule = rule;
        this.running = null;
        this.finished = false;
        this.error = null;
    }

    async run() {
        if (this.finished) return this;
        return await this.running || (this.running=this.start());
    }

    async start() {
        const dependencyJobs = await Promise.all(this.target.dependencies.map(dep => build.getJobFor(dep).run()));
        if(await this.build.anyChanged(this.target.dependencies)) {
            await this.rule.recipe.executeFor(this.rule);
        }
        return this;
    }
}
