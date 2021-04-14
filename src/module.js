var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _project, _parent, _name, _path, _absolutePath, _exports;
import fsPath from "path";
import { AID, Artifact } from "./graph/artifact.js";
import { Dependency } from "./graph/dependency.js";
export class Module {
    constructor(parent, path, name) {
        // noinspection TypeScriptFieldCanBeMadeReadonly
        _project.set(this, void 0);
        _parent.set(this, void 0);
        _name.set(this, void 0);
        _path.set(this, void 0);
        _absolutePath.set(this, void 0);
        _exports.set(this, {});
        __classPrivateFieldSet(this, _project, parent ? parent.project : null);
        __classPrivateFieldSet(this, _parent, parent);
        __classPrivateFieldSet(this, _path, path);
        __classPrivateFieldSet(this, _name, name);
        __classPrivateFieldSet(this, _absolutePath, this.parent ? fsPath.resolve(this.parent.absolutePath, path) : fsPath.resolve('/', path));
        if (this.project)
            this.project.addModule(this);
    }
    get project() { return __classPrivateFieldGet(this, _project); }
    get validProject() {
        if (!__classPrivateFieldGet(this, _project)) {
            throw new Error("Project reference must be set on the module for this operation");
        }
        return __classPrivateFieldGet(this, _project);
    }
    get parent() { return __classPrivateFieldGet(this, _parent); }
    get pathFromRoot() { return fsPath.relative(this.validProject.path, __classPrivateFieldGet(this, _absolutePath)); }
    get name() {
        // noinspection HtmlUnknownTag
        return __classPrivateFieldGet(this, _name) || `<${this.pathFromRoot.split('/').join('•')}>`;
    }
    get absolutePath() { return __classPrivateFieldGet(this, _absolutePath); }
    resolve(ref) {
        const aid = new AID('' + ref);
        if (aid.module && aid.module !== this.name) {
            return this.validProject.requireModuleByName(aid.module).resolve(aid.withModule((_ => _)()));
        }
        return fsPath.resolve(__classPrivateFieldGet(this, _absolutePath), aid.ref);
    }
    export(exports) {
        __classPrivateFieldSet(this, _exports, Object.assign({}, __classPrivateFieldGet(this, _exports), exports));
    }
    get exports() {
        return Object.assign({}, __classPrivateFieldGet(this, _exports));
    }
    static createRoot(project, name) {
        const rootModule = new Module(null, project.path, name);
        __classPrivateFieldSet(rootModule, _project, project);
        project.addModule(rootModule);
        return rootModule;
    }
}
_project = new WeakMap(), _parent = new WeakMap(), _name = new WeakMap(), _path = new WeakMap(), _absolutePath = new WeakMap(), _exports = new WeakMap();
function obtainArtifactReferenceFrom(resolvable) {
    if ("string" === typeof resolvable)
        return resolvable;
    if (resolvable instanceof Artifact)
        return resolvable.identity;
    if (resolvable instanceof Dependency)
        return resolvable.artifact.identity;
    if (resolvable instanceof AID)
        return resolvable.toString();
    if (null !== resolvable)
        return resolvable.artifact.identity;
    throw new Error("Object passed to obtainArtifactReferenceFrom cannot be converted to artifact reference");
}
export function resolveArtifacts(artifactManager, module, skipStrings, ...refs) {
    return refs.flat(Infinity).map(ref => {
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