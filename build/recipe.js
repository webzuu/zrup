import md5 from "md5";
import {UnimplementedAbstract} from "../error/unimplemented-abstract.js";
import {Dependency} from "../graph/dependency.js";
import {BuildError} from "./error.js";
import hash from "object-hash";

export class Recipe
{

    /** @type {Promise<(Object|null)>} */
    #configPromise = null;

    /** @type {(Job|null)} */
    #job = null;

    /** @return {(Job|null)} */
    get job() {
        return this.#job;
    }

    /** @param {Job} job */
    set job(job)
    {
        if (job===this.#job) return;
        if (this.#job) {
            throw new BuildError(`Attempt to reassign build job for recipe`);
        }
        this.#job = job;
        job.dependencies.push(
            new Dependency(
                job.build.artifactManager.get(`recipe:${job.rule.module.name}+${job.rule.name}`),
                Dependency.ABSENT_VIOLATION
            )
        );
    }

    reset()
    {
        this.#job = null;
        this.#configPromise = null;
    }

    get state()
    {
        return this.config;
    }

    get config()
    {
        return this.#configPromise || (this.#configPromise = this.createConfigPromise())
    }

    async createConfigPromise()
    {
        if (null===this.#job) {
            throw new Error("Attempt to access recipe state before it was employed by a build job");
        }
        return await this.computeConfigFor(this.#job);
    }

    /**
     * @param {Job} job
     * @return {Promise<Object>}
     * @abstract
     */
    async computeConfigFor(job)
    {
        throw new UnimplementedAbstract();
    }

    async execute()
    {
        await this.executeWithConfig(await this.config);
    }

    /**
     * @param {Object} config
     * @return {Promise<void>}
     * @protected
     * @abstract
     */
    async executeWithConfig(config)
    {
        throw new UnimplementedAbstract();
    }

    /** @return {Promise<string>} */
    get hash()
    {
        return (async () => hash.MD5({
            class: this.constructor.name,
            instance: this.describeState(await this.state)
        }))();
    }

    /**
     * @param {Object} state
     * @return {Object}
     * @protected
     */
    describeState(state)
    {
        return state;
    }
}

export class NopRecipe extends Recipe
{
    async executeWithConfig(config)
    {
        //well, this is a NOP
    }

    async computeConfigFor(job)
    {
        return {};
    }
}

