import fsPath from "path";
import { AID } from "./graph/artifact.js";
import { obtainArtifactReferenceFrom } from "./util/casts.js";
const flattenDepth = 4;
export class Module {
    constructor(parent, path, name) {
        this.$exports = {};
        this.$project = parent ? parent.project : null;
        this.$parent = parent;
        this.$path = path;
        this.$name = name;
        this.$absolutePath = this.parent ? fsPath.resolve(this.parent.absolutePath, path) : fsPath.resolve('/', path);
        if (this.project)
            this.project.addModule(this);
    }
    get project() { return this.$project; }
    get validProject() {
        if (!this.$project) {
            throw new Error("Project reference must be set on the module for this operation");
        }
        return this.$project;
    }
    get parent() { return this.$parent; }
    get pathFromRoot() { return fsPath.relative(this.validProject.path, this.$absolutePath); }
    get name() {
        // noinspection HtmlUnknownTag
        return this.$name || `<${this.pathFromRoot.split('/').join('•')}>`;
    }
    get absolutePath() { return this.$absolutePath; }
    resolve(ref) {
        const aid = new AID('' + ref);
        if (aid.module && aid.module !== this.name) {
            return this.validProject.requireModuleByName(aid.module).resolve(aid.withModule((_ => _)()));
        }
        return fsPath.resolve(this.$absolutePath, aid.ref);
    }
    export(exports) {
        this.$exports = Object.assign({}, this.$exports, exports);
    }
    get exports() {
        return Object.assign({}, this.$exports);
    }
    static createRoot(project, name) {
        const rootModule = new Module(null, project.path, name);
        rootModule.$project = project;
        project.addModule(rootModule);
        return rootModule;
    }
}
export function resolveArtifacts(artifactManager, module, skipStrings, ...refs) {
    return refs.flat(8).map(ref => {
        if ('string' === typeof ref && skipStrings)
            return ref;
        const artifact = artifactManager.get(new AID(obtainArtifactReferenceFrom(ref)).withDefaults({ module: module.name }));
        const externalIdentifier = artifactManager.resolveToExternalIdentifier(artifact.identity);
        const result = {
            toString: () => externalIdentifier
        };
        Object.defineProperty(result, "artifact", { get: () => artifact });
        return result;
    });
}
//# sourceMappingURL=module.js.map