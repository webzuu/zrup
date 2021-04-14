import md5 from "md5";
import {Dependency} from "./dependency.js";
import {ResolveArtifactResult} from "../module.js";

export namespace Artifact {
    export type ClassConstructor = {
        new(aid: Artifact.Reference, ...args : any) : Artifact,
        type?: string
    }
    export type Caps = {
        canWrite: boolean;
        canRemove: boolean;
        canBuild: boolean;
    }
    export type Reference = string | AID;
    export type References = Reference | References[];
    export type Resolvable = Reference | Artifact | Dependency | ResolveArtifactResult;
    export type Resolvables = Resolvable | Resolvables[];
    export type Descriptor = {
        type?: string;
        module?: string;
        ref: string;
    }
}

export abstract class Artifact  {

    readonly #identity : string;

    protected constructor(aid : Artifact.Reference)
    {
        this.#identity = ''+aid;
        this.validate();
    }

    get type() : string
    {
        return (AID.parse(this.#identity) as AID).type || '';
    }

    static computeKey(type: string, identity: string) : string
    {
        return md5(JSON.stringify([
            ["type", type],
            ["identity", identity]
        ]))
    }

    get key() : string
    {
        return Artifact.computeKey(this.type, this.identity);
    }

    abstract get version() : Promise<string>;
    abstract get exists() : Promise<boolean>;

    get identity() : string
    {
        return this.#identity;
    }

    get label() : string
    {
        return `${this.type} ${this.identity}`;
    }

    abstract rm() : Promise<void>;

    static readonly NONEXISTENT_VERSION = "[nonexistent]";

    get caps() : Artifact.Caps
    {
        return {
            canWrite: false,
            canRemove: false,
            canBuild: false
        };
    }

    private validate() {
        const aid = AID.parse(this.#identity);
        if (false === aid) {
            throw new Error(`Invalid AID string ${this.#identity} used to construct an Artifact instance`);
        }
    }
}

export class AID
{
    readonly #type? : string;
    readonly #module? : string;
    readonly #ref : string;
    constructor(aidString : string)
    {
        const descriptor = AID.parse(aidString);
        if (false===descriptor) throw new Error(`Invalid AID string ${aidString}`);
        this.#type = descriptor.type;
        this.#module = descriptor.module;
        this.#ref = descriptor.ref;
    }

    get type() : string | undefined { return this.#type; }

    get module() : string|undefined { return this.#module; }

    get ref() : string { return this.#ref || ''; }

    withType(type? : string) : AID
    {
        return new AID(AID.descriptorToString(Object.assign(this.descriptor,{type})));
    }

    withModule(module?: string) : AID
    {
        return new AID(AID.descriptorToString(Object.assign(this.descriptor,{module})));
    }

    withRef(ref : string) : AID
    {
        return new AID(AID.descriptorToString(Object.assign(this.descriptor,{ref})));
    }

    withDefaults(descriptor : Partial<Artifact.Descriptor>) : AID
    {
        const result = AID.parseCorrectly(this.toString()) as Record<string,string>;

        let defaultsUsed = false;
        for(let key of ["type","module","ref"])
        {
            const value = descriptor[key as keyof Artifact.Descriptor];
            if (value!==undefined && !result[key]) {
                defaultsUsed = true;
                result[key] = value;
            }
        }
        return (
            defaultsUsed
                ? new AID(AID.descriptorToString(result as Artifact.Descriptor))
                : this
        );
    }

    get descriptor() : Artifact.Descriptor
    {
        return {
            type: this.type,
            module: this.module,
            ref: this.ref
        };
    }

    static descriptorToString(descriptor: Artifact.Descriptor) : string
    {
        return (
            (descriptor.type ? `${descriptor.type}:` : "")
            + (descriptor.module ? `${descriptor.module}+` : "")
            + (descriptor.ref || "")
        );
    }

    toString() : string
    {
        return AID.descriptorToString(this);
    }

    static parse(aid: string) : Artifact.Descriptor|false
    {
        //TODO: handle escaped '+' in ref
        const matches = (''+aid).match(/^(?:(?<type>[-a-z]+):)?(?:(?<module>[A-Za-z_$][-0-9A-Za-z_$]*)\+)?(?<ref>[^+]*)$/);
        if (!(matches && matches.groups)) return false;
        const result : Artifact.Descriptor = { ref: "" };
        for(let key of ["type","module","ref"]) {
            const value = matches.groups[key];
            if (undefined !== value) {
                result[key as keyof Artifact.Descriptor] = value;
            }
        }
        return result;
    }

    static parseCorrectly(aid: string) : Artifact.Descriptor
    {
        const result = AID.parse(aid);
        if (false === result) throw new Error(`Could not parse "${aid}" as an AID string`);
        return result;
    }
}

interface ArtifactManagerIndex {
    factory: {
        type: { [k: string] : ArtifactFactory }
    },
    artifact: {
        key: { [k: string] : Artifact }
        identity: { [k: string] : Artifact }
    }
}

export class ArtifactManager
{
    #index : ArtifactManagerIndex = {
        factory: {
            type: {}
        },
        artifact: {
            key: {},
            identity: {}
        }
    };

    readonly #defaultType : string = "file";

    constructor(defaultType? : string)
    {
        this.#defaultType = defaultType || "file";
    }

    addFactory(factory : ArtifactFactory)
    {
        if (factory.type in this.#index.factory.type) {
            throw new Error(`Attempt to register more than one factory for artifact type "${factory.type}"`);
        }
        this.#index.factory.type[factory.type] = factory;
    }

    getFactoryForType(type: string|undefined, require? : boolean) : ArtifactFactory|null
    {
        const result = this.#index.factory.type[type || this.#defaultType] || null;
        if (!result && true===require) {
            throw new Error(`No factory was registered for artifact type "${type}"`);
        }
        return result;
    }

    requireFactoryForType(type: string|undefined) : ArtifactFactory
    {
        return this.getFactoryForType(type, true) as ArtifactFactory;
    }

    normalizeAID(aid : AID) : AID
    {
        const factory = this.getFactoryForType(aid.type, true);
        return factory ? factory.normalize(aid) : aid;
    }

    find(ref : Artifact.Reference) : Artifact|null
    {
        return this.#index.artifact.identity[""+ref] ?? null;
    }

    get(ref : Artifact.Reference) : Artifact
    {
        const aid = new AID(""+ref);
        const factory = this.requireFactoryForType(aid.type);
        const normalized = factory.normalize(aid);
        return this.find(normalized) || this.create(factory, normalized);
    }

    put(artifact : Artifact)
    {
        const found = this.find(artifact.identity);
        if (found === artifact) return;
        if (found) {
            throw new Error(`Attempted to store another artifact with already registered identity ${artifact.identity}`);
        }
        this.putNew(artifact);
    }

    private putNew(artifact : Artifact) {
        this.#index.artifact.key[artifact.key] = this.#index.artifact.identity[artifact.identity] = artifact;
    };

    get allReferences() : string[]
    {
        return Object.keys(this.#index.artifact.identity);
    }

    private create(factory: ArtifactFactory, aid: AID): Artifact
    {
        const artifact = factory.make(aid);
        this.putNew(artifact);
        return artifact;
    }

    resolveToExternalIdentifier(ref: Artifact.Reference)
    {
        const aid = this.normalizeAID(new AID(''+ref));
        return this.requireFactoryForType(aid.type).resolveToExternalIdentifier(aid);
    }
}

export abstract class ArtifactResolver

{
    normalize(aid : AID) : AID
    {
        return aid.withType(this.type);
    }

    abstract get type() : string;
    abstract resolveToExternalIdentifier(aid : AID) : string;
}

export abstract class ArtifactFactory
{
    /** @type {ArtifactManager} */
    #manager;

    /** @type {Artifact~ClassConstructor} */
    readonly #artifactConstructor;

    readonly #type : string;

    /** @type {ArtifactResolver} */
    readonly #artifactResolver;

    protected constructor(
        manager : ArtifactManager,
        artifactConstructor : Artifact.ClassConstructor,
        artifactResolver : ArtifactResolver,
        type? : string
    )
    {
        this.#manager = manager;
        this.#artifactResolver = artifactResolver;
        this.#artifactConstructor = artifactConstructor;
        const resolvedType = (
            type
            || artifactResolver.type
            || (this.constructor as {type?: string}).type
            || artifactConstructor.type
            || undefined
        );
        if ("string" !== typeof resolvedType) {
            throw new Error(
                "Resolver object or factory constructor must have a string property named \"type\", or the type argument must be given"
            );
        }
        this.#type = resolvedType;
        this.#manager.addFactory(this);
    }

    get artifactConstructor() : Artifact.ClassConstructor
    {
        return this.#artifactConstructor;
    }

    get type() : string
    {
        return this.#type;
    }

    normalize(aid : AID) : AID
    {
        return this.resolver.normalize(aid);
    }

    make(aid : Artifact.Reference, ...extra : any) : Artifact
    {
        return this.makeFromNormalized(this.normalize(new AID(""+aid)), ...extra);
    }

    makeFromNormalized(aid : AID, ...extra : any) : Artifact
    {
        const ctor = this.artifactConstructor;
        return new ctor(aid, ...this.prependRequiredConstructorArgs(aid, extra));
    }

    prependRequiredConstructorArgs(ref : Artifact.Reference, extraArgs? : any[]) : any[]
    {
        return extraArgs || [];
    }

    resolveToExternalIdentifier(aid : AID) : string
    {
        return this.resolver.resolveToExternalIdentifier(aid);
    }

    get resolver() : ArtifactResolver
    {
        return this.#artifactResolver;
    }

    static get type() : string
    {
        throw new Error("Unimplemented static abstract ArtifactFactory::get type()");
    }
}
