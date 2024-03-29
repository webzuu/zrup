import md5 from "md5";
import {UnimplementedAbstract} from "../error/unimplemented-abstract.js";

/**
 * @typedef {Function & { type: string|undefined }} Artifact~ClassConstructor
 */

/**
 * @typedef {Object} Artifact~Caps
 * @property {boolean} canWrite - if true, artifact's contents can be affected by builds
 * @property {boolean} canRemove - if true, artifact can be removed (for strict builds)
 * @property {boolean} canBuild - if false, consider the artifact to be a source and skip searching for producing rule
 */

/***/
export const Artifact = class Artifact  {

    /** @type {string} */
    #identity;

    /** @param {Artifact~Reference} aid */
    constructor(aid)
    {
        this.#identity = ''+aid;
    }

    /** @return {string} */
    get type()
    {
        return AID.parse(this.#identity).type;
    }

    /** @return {string} */
    static computeKey(type, identity)
    {
        return md5(JSON.stringify([
            ["type", type],
            ["identity", identity]
        ]))
    }

    /** @return {string} */
    get key()
    {
        return Artifact.computeKey(this.type, this.identity);
    }

    /**
     * @return {Promise<string|null>}
     * @abstract
     */
    get version()
    {
        throw new UnimplementedAbstract();
    }

    /**
     * @return {Promise<boolean>}
     * @abstract
     */
    get exists()
    {
        throw new UnimplementedAbstract();
    }

    /** @return {string} */
    get identity()
    {
        return this.#identity;
    }

    /** @return {string} */
    get label()
    {
        return `${this.type} ${this.identity}`;
    }

    /** @return {Promise<void>} */
    async rm()
    {
        throw new UnimplementedAbstract();
    }

    /** @return {string} */
    static get NONEXISTENT_VERSION() { return "[nonexistent]"; }

    /** @return {Artifact~Caps} */
    get caps()
    {
        return {
            canWrite: false,
            canRemove: false,
            canBuild: false
        };
    }
}

/***/
export const AID = class AID

{
    /** @type {string|undefined} */
    #type;
    /** @type {string|undefined} */
    #module;
    /** @type {string} */
    #ref;
    constructor(aidString)
    {
        const descriptor = AID.parse(aidString);
        if (false===descriptor) throw new Error(`Invalid AID string ${aidString}`);
        this.#type = descriptor.type;
        this.#module = descriptor.module;
        this.#ref = descriptor.ref;
    }

    /** @return {string|undefined} */
    get type() { return this.#type; }

    /** @return {string|undefined} */
    get module() { return this.#module; }

    /** @return {string} */
    get ref() { return this.#ref || ''; }

    /**
     * @param {string|undefined} [type]
     * @return {AID}
     */
    withType(type)
    {
        return new AID(AID.descriptorToString(Object.assign(this.descriptor,{type})));
    }

    /**
     * @param {string|undefined} [module]
     * @return {AID}
     */
    withModule(module)
    {
        return new AID(AID.descriptorToString(Object.assign(this.descriptor,{module})));
    }

    /**
     * @param {string} ref
     * @return {AID}
     */
    withRef(ref)
    {
        return new AID(AID.descriptorToString(Object.assign(this.descriptor,{ref})));
    }

    /**
     * @param {Object} descriptor
     */
    withDefaults(descriptor)
    {
        const result = AID.parse(this.toString());
        let defaultsUsed = false;
        for(let key of ["type","module","ref"])
        {
            if ((key in descriptor) && !result[key]) {
                defaultsUsed = true;
                result[key] = descriptor[key];
            }
        }
        return (
            defaultsUsed
                ? new AID(AID.descriptorToString(result))
                : this
        );
    }

    /** @return {Artifact~Descriptor} */
    get descriptor()
    {
        return {
            type: this.type,
            module: this.module,
            ref: this.ref
        };
    }

    /**
     * @param {Artifact~Descriptor} descriptor
     * @return {string}
     */
    static descriptorToString(descriptor)
    {
        return (
            (descriptor.type ? `${descriptor.type}:` : "")
            + (descriptor.module ? `${descriptor.module}+` : "")
            + (descriptor.ref || "")
        );
    }

    /**
     * @return {string}
     */
    toString()
    {
        return AID.descriptorToString(this);
    }

    /**
     * @param {string} aid
     * @return {Artifact~Descriptor|boolean}
     */
    static parse(aid)
    {
        //TODO: handle escaped '+' in ref
        const matches = (''+aid).match(/^(?:(?<type>[-a-z]+):)?(?:(?<module>[A-Za-z_$][-0-9A-Za-z_$]*)\+)?(?<ref>[^+]*)$/);
        if (!matches) return false;
        const result = {};
        for(let key of ['type','module','ref']) if (undefined !== matches.groups[key]) result[key] = matches.groups[key];
        return result;
    }
}

/***/
export const ArtifactManager = class ArtifactManager
{
    #index = {
        factory: {
            type: {}
        },
        artifact: {
            key: {},
            identity: {}
        }
    };

    /** @type {string} */
    #defaultType = "file";

    /** @param {string|undefined} [defaultType] */
    constructor(defaultType)
    {
        this.#defaultType = defaultType || "file";
    }

    /** @param {ArtifactFactory} factory */
    addFactory(factory)
    {
        if (factory.type in this.#index.factory.type) {
            throw new Error(`Attempt to register more than one factory for artifact type "${factory.type}"`);
        }
        this.#index.factory.type[factory.type] = factory;
    }

    /**
     * @param {string|null} type
     * @param {boolean|undefined} [require]
     * @return {ArtifactFactory|null}
     */
    getFactoryForType(type, require)
    {
        const result = this.#index.factory.type[type || this.#defaultType] || null;
        if (!result && true===require) {
            throw new Error(`No factory was registered for artifact type "${type}"`);
        }
        return result;
    }

    /**
     * @param {AID} aid
     * @return {AID}
     */
    normalizeAID(aid)
    {
        const factory = this.getFactoryForType(aid.type, true);
        return factory ? factory.normalize(aid) : aid;
    }

    /**
     * @param {Artifact~Reference} ref
     * @return {Artifact|null}
     */
    find(ref)
    {
        return this.#index.artifact.identity[""+ref];
    }

    /**
     * @param {Artifact~Reference} ref
     * @return {Artifact}
     */
    get(ref)
    {
        const aid = new AID(""+ref);
        const factory = this.getFactoryForType(aid.type, true);
        const normalized = factory.normalize(aid);
        return this.find(normalized) || this.#create(factory, normalized);
    }

    /** @param {Artifact} artifact */
    put(artifact)
    {
        const found = this.find(artifact.identity);
        if (found === artifact) return;
        if (found) {
            throw new Error(`Attempted to store another artifact with already registered identity ${artifact.identity}`);
        }
        this.#putNew(artifact);
    }

    /** @param {Artifact} artifact */
    #putNew(artifact)
    {
        this.#index.artifact.key[artifact.key] = this.#index.artifact.identity[artifact.identity] = artifact;
    }

    /**
     * @return {string[]}
     */
    get allReferences()
    {
        return Object.keys(this.#index.artifact.identity);
    }

    /**
     * @param {ArtifactFactory} factory
     * @param {AID} aid
     * @return {Artifact}
     */
    #create(factory, aid)
    {
        const artifact = factory.make(aid);
        this.#putNew(artifact);
        return artifact;
    }

    /**
     * @param {Artifact~Reference} ref
     * @return {string}
     */
    resolveToExternalIdentifier(ref)
    {
        const aid = this.normalizeAID(new AID(ref));
        return this.getFactoryForType(aid.type, true).resolveToExternalIdentifier(aid);
    }
}

/**
 * @abstract
 */
export const ArtifactResolver = class ArtifactResolver

{
    /**
     * @param {AID} aid
     * @return {AID}
     */
    normalize(aid)
    {
        return aid.withType(this.type);
    }

    /**
     * @return {string}
     * @abstract
     */
    get type()
    {
        throw new UnimplementedAbstract();
    }

    /**
     * @param {AID} aid
     * @return {string}
     * @abstract
     */
    resolveToExternalIdentifier(aid)
    {
        throw new UnimplementedAbstract();
    }

}

export const ArtifactFactory = class ArtifactFactory

{
    /** @type {ArtifactManager} */
    #manager;

    /** @type {Artifact~ClassConstructor} */
    #artifactConstructor;

    /** @type {string} */
    #type;

    /** @type {ArtifactResolver} */
    #artifactResolver;

    /**
     * @param {ArtifactManager} manager
     * @param {Artifact~ClassConstructor} artifactConstructor
     * @param {ArtifactResolver} artifactResolver
     * @param {string} [type]
     */
    constructor(
        manager,
        artifactConstructor,
        artifactResolver,
        type
    )
    {
        this.#manager = manager;
        this.#artifactResolver = artifactResolver;
        this.#artifactConstructor = artifactConstructor;
        this.#type = type || artifactResolver.type || this.constructor.type || artifactConstructor.type || null;
        if ("string" !== typeof this.#type) {
            throw new Error(
                "Resolver object or factory constructor must have a string property named \"type\", or the type argument must be given"
            );
        }
        this.#manager.addFactory(this);
    }

    /** @return {Artifact~ClassConstructor} */
    get artifactConstructor()
    {
        return this.#artifactConstructor;
    }

    /** @return {string} */
    get type()
    {
        return this.#type;
    }

    /**
     * @param {AID} aid
     * @return {AID}
     */
    normalize(aid)
    {
        return this.resolver.normalize(aid);
    }

    /**
     * @param {AID|string} aidOrAIDString
     * @param extra
     * @return {Artifact}
     */
    make(aidOrAIDString, ...extra)
    {
        return this.makeFromNormalized(this.normalize(new AID(""+aidOrAIDString)),...extra);
    }

    /**
     * @param {AID} aid
     * @param extra
     * @return {Artifact}
     */
    makeFromNormalized(aid, ...extra)
    {
        const ctor = this.artifactConstructor;
        return new ctor(aid, ...this.prependRequiredConstructorArgs(aid, extra));
    }

    /**
     * @param {Artifact~Reference} ref
     * @param {*[] | undefined} extraArgs
     * @return {*[]}
     */
    prependRequiredConstructorArgs(ref, extraArgs)
    {
        return extraArgs || [];
    }

    /**
     * @param {AID} aid
     * @return {string}
     */
    resolveToExternalIdentifier(aid)
    {
        return this.resolver.resolveToExternalIdentifier(aid);
    }

    /** @return {ArtifactResolver} */
    get resolver()
    {
        return this.#artifactResolver;
    }

    /**
     * @return {string|undefined}
     */
    static get type()
    {
        return undefined;
    }
}

/**
 * @typedef {(string|AID)} Artifact~Reference
 */

/**
 * @typedef {(Artifact~Reference|Artifact~References[])} Artifact~References
 */

/**
 * @typedef {Object} Artifact~Descriptor
 * @property {string|undefined} [type]
 * @property {string|undefined} [module]
 * @property {string|undefined} [ref]
 */

/**
 * @typedef {(Artifact~Reference|Artifact|Dependency)} Artifact~Resolvable
 */

/**
 * @typedef {(Artifact~Resolvable|Artifact~Resolvables[])} Artifact~Resolvables
 */
