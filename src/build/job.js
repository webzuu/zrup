/**
 * @property {Build} build
 * @property {Rule} rule
 * @property {Promise<Job>|null} promise
 * @property {boolean} Finished
 * @property {Error} error
 */
import BuildError from "@zrup/build/error";

export default class Job {

    constructor(build, rule) {
        this.build = build;
        this.rule = rule;
        this.recipeInvoked = false;
        this.promise = null;
        this.finished = false;
        this.error = null;
    }

    async run() {
        if (this.finished) return this;
        return await (this.promise || (this.promise = this.start()));
    }

    async start() {
        try {
            await Promise.all(this.rule.dependencies.map(dep => this.build.getJobFor(dep).run()));
            if(!(await this.build.isUpToDate(this.rule))) {
                this.recipeInvoked=true;
                await this.rule.recipe.executeFor(this.rule);
                await this.build.recordVersionInfo(this.rule);
            }
        }
        catch(e) {
            throw new BuildError(BuildError.formatRuleFailure(this.rule),e);
        }
        finally {
            this.promise = null;
            this.finished = true;
        }
        return this;
    }
}
