import {BuildError} from "./error";

export class Recipe
{
    /**
     * @param {Job} job
     * @abstract
     */
    async executeFor(job)
    {
        throw `Unimplemented abstract ${this.constructor.name}::executeFor()`;
    }
}

export class NopRecipe extends Recipe
{
    async executeFor(job)
    {
        //well, this is a NOP
    }
}

