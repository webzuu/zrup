export class DependencyCycle extends Error {
    constructor(chain) {
        super("Dependency cycle detected:\n"
            + chain.map(({ rule, artifact }) => `  ${rule.module.name}+${rule.name} -> ${artifact.identity}`).join("\n"));
        this.chain = chain;
    }
}
//# sourceMappingURL=dependency-cycle.js.map