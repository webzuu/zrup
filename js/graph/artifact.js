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
var _Artifact_identity, _AID_type, _AID_module, _AID_ref, _ArtifactManager_index, _ArtifactManager_defaultType, _ArtifactFactory_manager, _ArtifactFactory_artifactConstructor, _ArtifactFactory_type, _ArtifactFactory_artifactResolver;
import md5 from "md5";
export class Artifact {
    constructor(aid) {
        _Artifact_identity.set(this, void 0);
        __classPrivateFieldSet(this, _Artifact_identity, '' + aid, "f");
        this.validate();
    }
    get type() {
        return AID.parse(__classPrivateFieldGet(this, _Artifact_identity, "f")).type || '';
    }
    static computeKey(type, identity) {
        return md5(JSON.stringify([
            ["type", type],
            ["identity", identity]
        ]));
    }
    get key() {
        return Artifact.computeKey(this.type, this.identity);
    }
    get identity() {
        return __classPrivateFieldGet(this, _Artifact_identity, "f");
    }
    get label() {
        return `${this.type} ${this.identity}`;
    }
    get caps() {
        return {
            canWrite: false,
            canRemove: false,
            canBuild: false
        };
    }
    validate() {
        const aid = AID.parse(__classPrivateFieldGet(this, _Artifact_identity, "f"));
        if (false === aid) {
            throw new Error(`Invalid AID string ${__classPrivateFieldGet(this, _Artifact_identity, "f")} used to construct an Artifact instance`);
        }
    }
}
_Artifact_identity = new WeakMap();
Artifact.NONEXISTENT_VERSION = "[nonexistent]";
export class AID {
    constructor(aidString) {
        _AID_type.set(this, void 0);
        _AID_module.set(this, void 0);
        _AID_ref.set(this, void 0);
        const descriptor = AID.parse(aidString);
        if (false === descriptor)
            throw new Error(`Invalid AID string ${aidString}`);
        __classPrivateFieldSet(this, _AID_type, descriptor.type, "f");
        __classPrivateFieldSet(this, _AID_module, descriptor.module, "f");
        __classPrivateFieldSet(this, _AID_ref, descriptor.ref, "f");
    }
    get type() { return __classPrivateFieldGet(this, _AID_type, "f"); }
    get module() { return __classPrivateFieldGet(this, _AID_module, "f"); }
    get ref() { return __classPrivateFieldGet(this, _AID_ref, "f") || ''; }
    withType(type) {
        return new AID(AID.descriptorToString(Object.assign(this.descriptor, { type })));
    }
    withModule(module) {
        return new AID(AID.descriptorToString(Object.assign(this.descriptor, { module })));
    }
    withRef(ref) {
        return new AID(AID.descriptorToString(Object.assign(this.descriptor, { ref })));
    }
    withDefaults(descriptor) {
        const result = AID.parseCorrectly(this.toString());
        let defaultsUsed = false;
        for (let key of ["type", "module", "ref"]) {
            const value = descriptor[key];
            if (value !== undefined && !result[key]) {
                defaultsUsed = true;
                result[key] = value;
            }
        }
        return (defaultsUsed
            ? new AID(AID.descriptorToString(result))
            : this);
    }
    get descriptor() {
        return {
            type: this.type,
            module: this.module,
            ref: this.ref
        };
    }
    static descriptorToString(descriptor) {
        return ((descriptor.type ? `${descriptor.type}:` : "")
            + (descriptor.module ? `${descriptor.module}+` : "")
            + (descriptor.ref || ""));
    }
    toString() {
        return AID.descriptorToString(this);
    }
    static parse(aid) {
        //TODO: handle escaped '+' in ref
        const matches = ('' + aid).match(/^(?:(?<type>[-a-z]+):)?(?:(?<module>[A-Za-z_$][-0-9A-Za-z_$]*)\+)?(?<ref>[^+]*)$/);
        if (!(matches && matches.groups))
            return false;
        const result = { ref: "" };
        for (let key of ["type", "module", "ref"]) {
            const value = matches.groups[key];
            if (undefined !== value) {
                result[key] = value;
            }
        }
        return result;
    }
    static parseCorrectly(aid) {
        const result = AID.parse(aid);
        if (false === result)
            throw new Error(`Could not parse "${aid}" as an AID string`);
        return result;
    }
}
_AID_type = new WeakMap(), _AID_module = new WeakMap(), _AID_ref = new WeakMap();
export class ArtifactManager {
    constructor(defaultType) {
        _ArtifactManager_index.set(this, {
            factory: {
                type: {}
            },
            artifact: {
                key: {},
                identity: {}
            }
        });
        _ArtifactManager_defaultType.set(this, "file");
        __classPrivateFieldSet(this, _ArtifactManager_defaultType, defaultType || "file", "f");
    }
    addFactory(factory) {
        if (factory.type in __classPrivateFieldGet(this, _ArtifactManager_index, "f").factory.type) {
            throw new Error(`Attempt to register more than one factory for artifact type "${factory.type}"`);
        }
        __classPrivateFieldGet(this, _ArtifactManager_index, "f").factory.type[factory.type] = factory;
    }
    getFactoryForType(type, require) {
        const result = __classPrivateFieldGet(this, _ArtifactManager_index, "f").factory.type[type || __classPrivateFieldGet(this, _ArtifactManager_defaultType, "f")] || null;
        if (!result && true === require) {
            throw new Error(`No factory was registered for artifact type "${type}"`);
        }
        return result;
    }
    requireFactoryForType(type) {
        return this.getFactoryForType(type, true);
    }
    normalizeAID(aid) {
        const factory = this.getFactoryForType(aid.type, true);
        return factory ? factory.normalize(aid) : aid;
    }
    find(ref) {
        return __classPrivateFieldGet(this, _ArtifactManager_index, "f").artifact.identity["" + ref] ?? null;
    }
    get(ref) {
        const aid = new AID("" + ref);
        const factory = this.requireFactoryForType(aid.type);
        const normalized = factory.normalize(aid);
        return this.find(normalized) || this.create(factory, normalized);
    }
    put(artifact) {
        const found = this.find(artifact.identity);
        if (found === artifact)
            return;
        if (found) {
            throw new Error(`Attempted to store another artifact with already registered identity ${artifact.identity}`);
        }
        this.putNew(artifact);
    }
    putNew(artifact) {
        __classPrivateFieldGet(this, _ArtifactManager_index, "f").artifact.key[artifact.key] = __classPrivateFieldGet(this, _ArtifactManager_index, "f").artifact.identity[artifact.identity] = artifact;
    }
    ;
    get allReferences() {
        return Object.keys(__classPrivateFieldGet(this, _ArtifactManager_index, "f").artifact.identity);
    }
    create(factory, aid) {
        const artifact = factory.make(aid);
        this.putNew(artifact);
        return artifact;
    }
    resolveToExternalIdentifier(ref) {
        const aid = this.normalizeAID(new AID('' + ref));
        return this.requireFactoryForType(aid.type).resolveToExternalIdentifier(aid);
    }
}
_ArtifactManager_index = new WeakMap(), _ArtifactManager_defaultType = new WeakMap();
export class ArtifactResolver {
    normalize(aid) {
        return aid.withType(this.type);
    }
}
export class ArtifactFactory {
    constructor(manager, artifactConstructor, artifactResolver, type) {
        /** @type {ArtifactManager} */
        _ArtifactFactory_manager.set(this, void 0);
        /** @type {Artifact~ClassConstructor} */
        _ArtifactFactory_artifactConstructor.set(this, void 0);
        _ArtifactFactory_type.set(this, void 0);
        /** @type {ArtifactResolver} */
        _ArtifactFactory_artifactResolver.set(this, void 0);
        __classPrivateFieldSet(this, _ArtifactFactory_manager, manager, "f");
        __classPrivateFieldSet(this, _ArtifactFactory_artifactResolver, artifactResolver, "f");
        __classPrivateFieldSet(this, _ArtifactFactory_artifactConstructor, artifactConstructor, "f");
        const resolvedType = (type
            || artifactResolver.type
            || this.constructor.type
            || artifactConstructor.type
            || undefined);
        if ("string" !== typeof resolvedType) {
            throw new Error("Resolver object or factory constructor must have a string property named \"type\", or the type argument must be given");
        }
        __classPrivateFieldSet(this, _ArtifactFactory_type, resolvedType, "f");
        __classPrivateFieldGet(this, _ArtifactFactory_manager, "f").addFactory(this);
    }
    get artifactConstructor() {
        return __classPrivateFieldGet(this, _ArtifactFactory_artifactConstructor, "f");
    }
    get type() {
        return __classPrivateFieldGet(this, _ArtifactFactory_type, "f");
    }
    normalize(aid) {
        return this.resolver.normalize(aid);
    }
    make(aid, ...extra) {
        return this.makeFromNormalized(this.normalize(new AID("" + aid)), ...extra);
    }
    makeFromNormalized(aid, ...extra) {
        const ctor = this.artifactConstructor;
        return new ctor(aid, ...this.prependRequiredConstructorArgs(aid, extra));
    }
    prependRequiredConstructorArgs(ref, extraArgs) {
        return extraArgs || [];
    }
    resolveToExternalIdentifier(aid) {
        return this.resolver.resolveToExternalIdentifier(aid);
    }
    get resolver() {
        return __classPrivateFieldGet(this, _ArtifactFactory_artifactResolver, "f");
    }
    static get type() {
        throw new Error("Unimplemented static abstract ArtifactFactory::get type()");
    }
}
_ArtifactFactory_manager = new WeakMap(), _ArtifactFactory_artifactConstructor = new WeakMap(), _ArtifactFactory_type = new WeakMap(), _ArtifactFactory_artifactResolver = new WeakMap();
//# sourceMappingURL=artifact.js.map