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
var _identity, _type, _module, _ref, _index, _defaultType, _manager, _artifactConstructor, _type_1, _artifactResolver;
import md5 from "md5";
export class Artifact {
    constructor(aid) {
        _identity.set(this, void 0);
        __classPrivateFieldSet(this, _identity, '' + aid);
        this.validate();
    }
    get type() {
        return AID.parse(__classPrivateFieldGet(this, _identity)).type || '';
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
        return __classPrivateFieldGet(this, _identity);
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
        const aid = AID.parse(__classPrivateFieldGet(this, _identity));
        if (false === aid) {
            throw new Error(`Invalid AID string ${__classPrivateFieldGet(this, _identity)} used to construct an Artifact instance`);
        }
    }
}
_identity = new WeakMap();
Artifact.NONEXISTENT_VERSION = "[nonexistent]";
export class AID {
    constructor(aidString) {
        _type.set(this, void 0);
        _module.set(this, void 0);
        _ref.set(this, void 0);
        const descriptor = AID.parse(aidString);
        if (false === descriptor)
            throw new Error(`Invalid AID string ${aidString}`);
        __classPrivateFieldSet(this, _type, descriptor.type);
        __classPrivateFieldSet(this, _module, descriptor.module);
        __classPrivateFieldSet(this, _ref, descriptor.ref);
    }
    get type() { return __classPrivateFieldGet(this, _type); }
    get module() { return __classPrivateFieldGet(this, _module); }
    get ref() { return __classPrivateFieldGet(this, _ref) || ''; }
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
_type = new WeakMap(), _module = new WeakMap(), _ref = new WeakMap();
export class ArtifactManager {
    constructor(defaultType) {
        _index.set(this, {
            factory: {
                type: {}
            },
            artifact: {
                key: {},
                identity: {}
            }
        });
        _defaultType.set(this, "file");
        __classPrivateFieldSet(this, _defaultType, defaultType || "file");
    }
    addFactory(factory) {
        if (factory.type in __classPrivateFieldGet(this, _index).factory.type) {
            throw new Error(`Attempt to register more than one factory for artifact type "${factory.type}"`);
        }
        __classPrivateFieldGet(this, _index).factory.type[factory.type] = factory;
    }
    getFactoryForType(type, require) {
        const result = __classPrivateFieldGet(this, _index).factory.type[type || __classPrivateFieldGet(this, _defaultType)] || null;
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
        return __classPrivateFieldGet(this, _index).artifact.identity["" + ref] ?? null;
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
        __classPrivateFieldGet(this, _index).artifact.key[artifact.key] = __classPrivateFieldGet(this, _index).artifact.identity[artifact.identity] = artifact;
    }
    ;
    get allReferences() {
        return Object.keys(__classPrivateFieldGet(this, _index).artifact.identity);
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
_index = new WeakMap(), _defaultType = new WeakMap();
export class ArtifactResolver {
    normalize(aid) {
        return aid.withType(this.type);
    }
}
export class ArtifactFactory {
    constructor(manager, artifactConstructor, artifactResolver, type) {
        /** @type {ArtifactManager} */
        _manager.set(this, void 0);
        /** @type {Artifact~ClassConstructor} */
        _artifactConstructor.set(this, void 0);
        _type_1.set(this, void 0);
        /** @type {ArtifactResolver} */
        _artifactResolver.set(this, void 0);
        __classPrivateFieldSet(this, _manager, manager);
        __classPrivateFieldSet(this, _artifactResolver, artifactResolver);
        __classPrivateFieldSet(this, _artifactConstructor, artifactConstructor);
        const resolvedType = (type
            || artifactResolver.type
            || this.constructor.type
            || artifactConstructor.type
            || undefined);
        if ("string" !== typeof resolvedType) {
            throw new Error("Resolver object or factory constructor must have a string property named \"type\", or the type argument must be given");
        }
        __classPrivateFieldSet(this, _type_1, resolvedType);
        __classPrivateFieldGet(this, _manager).addFactory(this);
    }
    get artifactConstructor() {
        return __classPrivateFieldGet(this, _artifactConstructor);
    }
    get type() {
        return __classPrivateFieldGet(this, _type_1);
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
        return __classPrivateFieldGet(this, _artifactResolver);
    }
    static get type() {
        throw new Error("Unimplemented static abstract ArtifactFactory::get type()");
    }
}
_manager = new WeakMap(), _artifactConstructor = new WeakMap(), _type_1 = new WeakMap(), _artifactResolver = new WeakMap();
//# sourceMappingURL=artifact.js.map