import {Rule} from "../graph/rule.js";
import {Artifact} from "../graph/artifact.js";

export class DependencyCycle extends Error
{
    chain: Array<{rule: Rule, artifact: Artifact}>;
    constructor(chain: {rule: Rule, artifact: Artifact}[])
    {
        super(
            "Dependency cycle detected:\n"
            + chain.map(({rule, artifact}) => `  ${rule.name} -> ${artifact.key}`).join("\n")
        );
        this.chain = chain;
    }
}