import fsPath from "path";
import {AID, Artifact, ArtifactManager} from "./graph/artifact.js";
import {Dependency} from "./graph/dependency.js";
import {Project} from "./project";

export class Module

{
    // noinspection TypeScriptFieldCanBeMadeReadonly
    #project : Project | null;

    readonly #parent : Module | null;

    readonly #name? : string;

    #path : string;

    readonly #absolutePath : string;

    #exports = {};

    constructor(parent : Module|null, path : string, name? : string)
    {
        this.#project = parent ? parent.project : null;
        this.#parent = parent;
        this.#path = path;
        this.#name = name;
        this.#absolutePath = this.parent ? fsPath.resolve(this.parent.absolutePath,path) : fsPath.resolve('/',path);
        if (this.project) this.project.addModule(this);
    }

    get project() : Project|null { return this.#project; }
    get validProject() : Project
    {
        if (!this.#project) {
            throw new Error("Project reference must be set on the module for this operation");
        }
        return this.#project;
    }

    get parent() : Module|null { return this.#parent; }

    get pathFromRoot() : string { return fsPath.relative(this.validProject.path, this.#absolutePath); }

    get name() : string {
        // noinspection HtmlUnknownTag
        return this.#name || `<${this.pathFromRoot.split('/').join('•')}>`;
    }

    get absolutePath() : string { return this.#absolutePath; }

    resolve(ref : Artifact.Reference) : string {
        const aid = new AID(''+ref);
        if (aid.module && aid.module !== this.name) {
            return this.validProject.requireModuleByName(aid.module).resolve(aid.withModule((_=>_)()));
        }
        return fsPath.resolve(this.#absolutePath, aid.ref);
    }

    export(exports : Record<string,any>)
    {
        this.#exports = Object.assign({}, this.#exports, exports);
    }

    get exports() : Record<string,any>
    {
        return Object.assign({}, this.#exports);
    }

    static createRoot(project : Project, name : string) : Module
    {
        const rootModule = new Module(null, project.path, name);
        rootModule.#project = project;
        project.addModule(rootModule);
        return rootModule;
    }
}

function obtainArtifactReferenceFrom(resolvable : Artifact.Resolvable) : string {
    if ("string" === typeof resolvable) return resolvable;
    if (resolvable instanceof Artifact) return resolvable.identity;
    if (resolvable instanceof Dependency) return resolvable.artifact.identity;
    if (resolvable instanceof AID) return resolvable.toString();
    if (null!==resolvable) return resolvable.artifact.identity;
    throw new Error("Object passed to obtainArtifactReferenceFrom cannot be converted to artifact reference");
}

export interface ResolveArtifactResult {
    toString() : string,
    artifact: Artifact
}

export function resolveArtifacts(
    artifactManager                         : ArtifactManager,
    module                                  : Module,
    skipStrings                             : boolean,
    ...refs                                 : Artifact.Resolvables[]
) : (string|ResolveArtifactResult)[] {

    return (refs.flat(Infinity) as Artifact.Resolvable[]).map(ref => {
        if ('string'===typeof ref && skipStrings) return ref;
        const artifact = artifactManager.get(
            new AID(obtainArtifactReferenceFrom(ref)).withDefaults({module: module.name})
        );
        const externalIdentifier = artifactManager.resolveToExternalIdentifier(artifact.identity);
        const result = {
            toString: () => externalIdentifier
        };
        Object.defineProperty(result, "artifact", {get: () => artifact});
        return result as ResolveArtifactResult;
    });
}
