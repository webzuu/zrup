import {UnimplementedAbstract} from "../error/unimplemented-abstract.js";
import hash from "object-hash";

export const Recipe = class Recipe

{
    /**
     * @param {Job} job
     * @return {Promise<Object>}
     * @abstract
     */
    async resolveSpecFor(job)
    {
        throw new UnimplementedAbstract();
    }

    /**
     * @param {Job} job
     * @param {Object} spec
     * @return {Promise<void>}
     * @abstract
     */
    async executeFor(job, spec)
    {
        throw new UnimplementedAbstract();
    }

    /** @return {Promise<string>} */
    hashSpec(spec)
    {
        return (async () => hash.MD5({
            class: this.constructor.name,
            instance: this.describeSpec(spec)
        }))();
    }

    /**
     * @param {Object} spec
     * @return {Object}
     * @protected
     */
    describeSpec(spec)
    {
        return spec;
    }

    /**
     * @return {string}
     */
    get consoleOutput()
    {
        return "";
    }
}

export const NopRecipe = class NopRecipe extends Recipe

{
    async executeFor(job, spec)
    {
        //well, this is a NOP
    }

    async resolveSpecFor(job)
    {
        return {};
    }
}

