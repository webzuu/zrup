import fsPath from "path";
import {AID} from "./graph/artifact";

export class Module
{
    /** @type {Project} */
    #project;

    /** @type {Module|null} */
    #parent;

    /** @type {string|null} */
    #name;

    /** @type {string} */
    #path;

    /** @type {string} */
    #absolutePath;

    /**
     *
     * @param {Module|null} parent
     * @param {string} path
     * @param {string|undefined} [name]
     */
    constructor(parent, path, name)
    {
        this.#project = parent ? parent.project : null;
        this.#parent = parent;
        this.#path = path;
        this.#name = name || null;
        this.#absolutePath = this.parent ? fsPath.resolve(this.parent.absolutePath,path) : fsPath.resolve('/',path);
        if (this.project) this.project.addModule(this);
    }

    /** @return {Project} */
    get project() { return this.#project; }

    /** @return {Module|null} */
    get parent() { return this.#parent; }

    /** @return {string} */
    get pathFromRoot() { return fsPath.relative(this.project.path, this.#absolutePath); }

    /** @return {string|null} */
    get name() { return this.#name || `<${this.pathFromRoot.replaceAll('/','•')}>`; }

    /** @return {string} */
    get absolutePath() { return this.#absolutePath; }

    /**
     * @param {Artifact~Reference} ref
     * @return {string}
     */
    resolve(ref) {
        const aid = new AID(''+ref);
        if (aid.module && aid.module !== this.name) {
            return this.project.getModuleByName(aid.module,true).resolve(aid.withModule((_=>_)()));
        }
        return fsPath.resolve(this.#absolutePath, aid.ref);
    }

    /**
     *
     * @param {Project} project
     * @param {string} name
     * @return {Module}
     */
    static createRoot(project, name)
    {
        const rootModule = new Module(null, project.path, name);
        rootModule.#project = project;
        project.addModule(rootModule);
        return rootModule;
    }
}
