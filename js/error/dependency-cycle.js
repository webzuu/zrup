export class DependencyCycle extends Error {
    constructor(chain) {
        super("Dependency cycle detected:\n"
            + chain.map(({ rule, artifact }) => `  ${rule.name} -> ${artifact.key}`).join("\n"));
        this.chain = chain;
    }
}
//# sourceMappingURL=dependency-cycle.js.map