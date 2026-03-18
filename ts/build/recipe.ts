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

    hashSpecUsing(spec : Record<string,any>, algorithm: string, hashService: any) : Promise<string>
    {
        return (async () => {
            const specDescriptor = {
                class: this.constructor.name,
                instance: this.describeSpec(spec)
            };
            // Use object-hash to get normalized string, then hash with specified algorithm
            const normalizedString = hash(specDescriptor, { algorithm: 'passthrough' });
            return await hashService.hashObject(normalizedString, algorithm);
        })();
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
    // noinspection JSUnusedLocalSymbols
    async executeFor(job : Job, spec : Object) : Promise<void>
    {
        //well, this is a NOP
    }

    // noinspection JSUnusedLocalSymbols
    async concretizeSpecFor(job : Job) : Promise<Object>
    {
        return {};
    }
}

