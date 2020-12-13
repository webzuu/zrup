import {BuildError} from "./error";

export class Recipe
{
    /**
     * @param {Job} job
     */
    async executeFor(job)
    {
        throw `Unimplemented abstract ${this.constructor.name}::executeFor()`;
    }
}

export class SourceRecipe extends Recipe
{
    async executeFor(job)
    {
        const existencePromises = job.rule.outputs.map(_ => _.exists);
        const existences = await Promise.all(existencePromises);
        let notFound = [];
        for(let i=0; i<existences.length; ++i) if (!existences[i]) notFound.push(job.rule.outputs[i].label);
        if (notFound.length) {
            throw new BuildError(`source(s) not found:\n\t${notFound.join("\n\t")}`);
        }
    }
}

export class NopRecipe extends Recipe
{
    async executeFor(job)
    {
        //well, this is a NOP
    }
}