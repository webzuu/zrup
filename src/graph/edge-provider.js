export class EdgeProvider
{
    /**
     * @param {Build} build
     * @return {Promise<Artifact[]>}
     */
    getEdges(build)
    {
        throw "Undefined abstract getter EdgeProvider::edges()"
    }
}

export class ArtifactList extends EdgeProvider
{
    /**
     * @type {Artifact[]}
     */
    #edges;

    /**
     *
     * @param {Artifact[]} edges
     */
    constructor(edges)
    {
        super();
        this.#edges = edges;
    }

    /**
     * @param {Build} build
     * @return {Promise<Artifact[]>}
     */
    getEdges(build)
    {
        return Promise.resolve(this.#edges);
    }
}

class DynamicArtifactList extends EdgeProvider
{
    constructor(dependencies, recipe)
    {
        super();
        this.#rule = rule;
    }
}