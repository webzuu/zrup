import hash from "object-hash";
export class Recipe {
    hashSpec(spec) {
        return (async () => hash.MD5({
            class: this.constructor.name,
            instance: this.describeSpec(spec)
        }))();
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