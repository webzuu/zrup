import hash from "object-hash";
export class Recipe {
    hashSpec(spec) {
        return (async () => hash.MD5({
            class: this.constructor.name,
            instance: this.describeSpec(spec)
        }))();
    }
    hashSpecUsing(spec, algorithm, hashService) {
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
    describeSpec(spec) {
        return spec;
    }
    get consoleOutput() {
        return "";
    }
}
export class NopRecipe extends Recipe {
    // noinspection JSUnusedLocalSymbols
    async executeFor(job, spec) {
        //well, this is a NOP
    }
    // noinspection JSUnusedLocalSymbols
    async concretizeSpecFor(job) {
        return {};
    }
}
//# sourceMappingURL=recipe.js.map