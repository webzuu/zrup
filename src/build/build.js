export default class Build {

    /**
     *
     * @param graph
     */
    constructor(graph)
    {
        this.graph = graph;
        this.index = {
            rule: {
                job: new Map()
            }
        }
    }

    getJobFor(artifact)
    {
        const rule = this.graph.index.output.rule.get(artifact.key);
        if (rule) return this.getJobForRule(rule.key);
        return this.getSourceJobFor(artifact);
    }

    /**
     *
     * @param {string} ruleKey
     * @return {Job}
     */
    getJobForRule(ruleKey)
    {
        if (!this.index.rule.job.has(ruleKey)) {
            this.index.rule.job.set(ruleKey, new Job(this, this.graph.index.rule.key[ruleKey]));
        }
        return this.index.rule.job.get(ruleKey);
    }

    async anyChanged(artifacts)
    {

    }

    /**
     *
     * @param {Artifact} artifact
     * @
     */
    #createJobFor(artifact) {
        const rule = this.graph.getRuleFor(artifact);
    }
}