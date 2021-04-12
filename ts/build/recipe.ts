import {Job} from "./job.js";
import hash from "object-hash";

export abstract class Recipe
{
    abstract concretizeSpecFor(job : Job) : Promise<Object>;

    abstract executeFor(job : Job, spec : Object) : Promise<void>;

    hashSpec(spec : Record<string,any>) : Promise<string>
    {
        return (async () => hash.MD5({
            class: this.constructor.name,
            instance: this.describeSpec(spec)
        }))();
    }

    protected describeSpec(spec : Object) : Object
    {
        return spec;
    }

    get consoleOutput() : string
    {
        return "";
    }
}

export class NopRecipe extends Recipe
{
    async executeFor(job : Job, spec : Object) : Promise<void>
    {
        //well, this is a NOP
    }

    async concretizeSpecFor(job : Job) : Promise<Object>
    {
        return {};
    }
}

