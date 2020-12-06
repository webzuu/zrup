import BuildError from "@zrup/build/error";

export default class Recipe
{
    /**
     * @param {Job} job
     */
    async executeFor(job) {
        throw `Unimplemented abstract method executeFor()`;
    }
}

export class SourceRecipe extends Recipe
{
    async executeFor(job)
    {
        const existences = await Promise.all(job.rule.outputs.map(_ => _.exists));
        let notFound = [];
        for(let i=0; i<existences.length; ++i) if (!existences[i]) notFound.push(job.rule.outputs[i].label);
        if (notFound.length) {
            throw new BuildError(`source(s) not found:\n\t${notFound.join("\n\t")}`);
        }
    }
}