import md5 from "md5";

export class Artifact {

    /** @type {string} */
    #identity;

    /** @param {AID|string} aid */
    constructor(aid)
    {
        this.#identity = ''+aid;
    }

    /**
     * @return {string}
     * @abstract
     */
    get type()
    {
        throw new Error(`Unimplemented abstract ${this.constructor.name}::get type()`);
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
        throw new Error(`Unimplemented abstract ${this.constructor.name}::get version()`);
    }

    /**
     * @return {Promise<boolean>}
     * @abstract
     */
    get exists()
    {
        throw new Error(`Unimplemented abstract ${this.constructor.name}::get exists()`);
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

    /** @return {string} */
    static get NONEXISTENT_VERSION() { return "[nonexistent]"; }
}

export class ArtifactManager
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
     * @param {Artifact~reference} ref
     * @return {Artifact|null}
     */
    find(ref)
    {
        return this.#index.artifact.identity[""+ref];
    }

    /**
     * @param {Artifact~reference} ref
     * @return {Artifact}
     */
    get(ref)
    {
        const aid = new AID(""+ref);
        const factory = this.getFactoryForType(aid.type, true);
        const normalized = factory.normalize(aid);
        return this.find(normalized) || this.#create(factory, normalized);
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
        this.#index.artifact.key[artifact.key] = this.#index.artifact.identity[artifact.identity] = artifact;
        return artifact;
    }
}

/**
 * @typedef {Function & { type: string|undefined }} Artifact~ClassConstructor
 */

export class ArtifactFactory
{
    /** @type {ArtifactManager} */
    #manager;

    /** @type {Artifact~ClassConstructor} */
    #artifactConstructor;

    /** @type {string} */
    #type;

    /**
     * @param {ArtifactManager} manager
     * @param {Artifact~ClassConstructor} artifactConstructor
     */
    constructor(manager, artifactConstructor)
    {
        const type = artifactConstructor.type || this.constructor.type || null;
        if ("string" !== typeof type) {
            throw new Error(
                "Either the artifact class or the factory class must have a static string property named \"type\""
            );
        }
        this.#manager = manager;
        this.#artifactConstructor = artifactConstructor;
        this.#type = type;
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
        return aid.withType(this.type);
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
     * @param {Artifact~reference} ref
     * @param {*[] | undefined} extraArgs
     * @return {*[]}
     */
    prependRequiredConstructorArgs(ref, extraArgs)
    {
        return extraArgs || [];
    }
}

export class AID
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

    /** @return {Artifact~descriptor} */
    get descriptor()
    {
        return {
            type: this.type,
            module: this.module,
            ref: this.ref
        };
    }

    /**
     * @param {Artifact~descriptor} descriptor
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
     * @return {Artifact~descriptor|boolean}
     */
    static parse(aid)
    {
        const matches = (''+aid).match(/^(?:(?<type>[-a-z]+):)?(?:(?<module>[A-Za-z_][-0-9A-Za-z_]*)\+)?(?<ref>[/-_.0-9A-Za-z]*)$/);
        if (!matches) return false;
        const result = {};
        for(let key of ['type','module','ref']) if (undefined !== matches.groups[key]) result[key] = matches.groups[key];
        return result;
    }
}

/**
 * @typedef {string|AID} Artifact~reference
 */

/**
 * @typedef {Object} Artifact~descriptor
 * @property {string|undefined} [type]
 * @property {string|undefined} [module]
 * @property {string|undefined} [ref]
 */

