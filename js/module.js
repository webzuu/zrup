var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Module_project, _Module_parent, _Module_name, _Module_path, _Module_absolutePath, _Module_exports;
import fsPath from "path";
import { AID } from "./graph/artifact.js";
import { obtainArtifactReferenceFrom } from "./util/casts.js";
export class Module {
    constructor(parent, path, name) {
        // noinspection TypeScriptFieldCanBeMadeReadonly
        _Module_project.set(this, void 0);
        _Module_parent.set(this, void 0);
        _Module_name.set(this, void 0);
        _Module_path.set(this, void 0);
        _Module_absolutePath.set(this, void 0);
        _Module_exports.set(this, {});
        __classPrivateFieldSet(this, _Module_project, parent ? parent.project : null, "f");
        __classPrivateFieldSet(this, _Module_parent, parent, "f");
        __classPrivateFieldSet(this, _Module_path, path, "f");
        __classPrivateFieldSet(this, _Module_name, name, "f");
        __classPrivateFieldSet(this, _Module_absolutePath, this.parent ? fsPath.resolve(this.parent.absolutePath, path) : fsPath.resolve('/', path), "f");
        if (this.project)
            this.project.addModule(this);
    }
    get project() { return __classPrivateFieldGet(this, _Module_project, "f"); }
    get validProject() {
        if (!__classPrivateFieldGet(this, _Module_project, "f")) {
            throw new Error("Project reference must be set on the module for this operation");
        }
        return __classPrivateFieldGet(this, _Module_project, "f");
    }
    get parent() { return __classPrivateFieldGet(this, _Module_parent, "f"); }
    get pathFromRoot() { return fsPath.relative(this.validProject.path, __classPrivateFieldGet(this, _Module_absolutePath, "f")); }
    get name() {
        // noinspection HtmlUnknownTag
        return __classPrivateFieldGet(this, _Module_name, "f") || `<${this.pathFromRoot.split('/').join('•')}>`;
    }
    get absolutePath() { return __classPrivateFieldGet(this, _Module_absolutePath, "f"); }
    resolve(ref) {
        const aid = new AID('' + ref);
        if (aid.module && aid.module !== this.name) {
            return this.validProject.requireModuleByName(aid.module).resolve(aid.withModule((_ => _)()));
        }
        return fsPath.resolve(__classPrivateFieldGet(this, _Module_absolutePath, "f"), aid.ref);
    }
    export(exports) {
        __classPrivateFieldSet(this, _Module_exports, Object.assign({}, __classPrivateFieldGet(this, _Module_exports, "f"), exports), "f");
    }
    get exports() {
        return Object.assign({}, __classPrivateFieldGet(this, _Module_exports, "f"));
    }
    static createRoot(project, name) {
        const rootModule = new Module(null, project.path, name);
        __classPrivateFieldSet(rootModule, _Module_project, project, "f");
        project.addModule(rootModule);
        return rootModule;
    }
}
_Module_project = new WeakMap(), _Module_parent = new WeakMap(), _Module_name = new WeakMap(), _Module_path = new WeakMap(), _Module_absolutePath = new WeakMap(), _Module_exports = new WeakMap();
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