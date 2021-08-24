import { Dependency } from "./dependency.js";
import { ResolveArtifactResult } from "../module.js";
import { EmptyWorkaround, ValueOrArray } from "../util/types.js";
export declare namespace Artifact {
    type Reference = string | AID;
    type ClassConstructor = {
        new (aid: Reference, ...args: any): Artifact;
        type?: string;
    };
    type Caps = {
        canWrite: boolean;
        canRemove: boolean;
        canBuild: boolean;
    };
    type References = ValueOrArray<EmptyWorkaround<Reference>>;
    type Resolvable = Reference | Artifact | Dependency | ResolveArtifactResult;
    type Resolvables = ValueOrArray<EmptyWorkaround<Resolvable>>;
    type Descriptor = {
        type?: string;
        module?: string;
        ref: string;
    };
}
export declare abstract class Artifact {
    #private;
    protected constructor(aid: Artifact.Reference);
    get type(): string;
    static computeKey(type: string, identity: string): string;
    get key(): string;
    abstract get version(): Promise<string>;
    abstract get exists(): Promise<boolean>;
    get identity(): string;
    get label(): string;
    abstract rm(): Promise<void>;
    static readonly NONEXISTENT_VERSION = "[nonexistent]";
    get caps(): Artifact.Caps;
    private validate;
}
export declare class AID {
    #private;
    constructor(aidString: string);
    get type(): string | undefined;
    get module(): string | undefined;
    get ref(): string;
    withType(type?: string): AID;
    withModule(module?: string): AID;
    withRef(ref: string): AID;
    withDefaults(descriptor: Partial<Artifact.Descriptor>): AID;
    get descriptor(): Artifact.Descriptor;
    static descriptorToString(descriptor: Artifact.Descriptor): string;
    toString(): string;
    static parse(aid: string): Artifact.Descriptor | false;
    static parseCorrectly(aid: string): Artifact.Descriptor;
}
export declare class ArtifactManager {
    #private;
    constructor(defaultType?: string);
    addFactory(factory: ArtifactFactory): void;
    getFactoryForType(type: string | undefined, require?: boolean): ArtifactFactory | null;
    requireFactoryForType(type: string | undefined): ArtifactFactory;
    normalizeAID(aid: AID): AID;
    find(ref: Artifact.Reference): Artifact | null;
    get(ref: Artifact.Reference): Artifact;
    put(artifact: Artifact): void;
    private putNew;
    get allReferences(): string[];
    private create;
    resolveToExternalIdentifier(ref: Artifact.Reference): string;
}
export declare abstract class ArtifactResolver {
    normalize(aid: AID): AID;
    abstract get type(): string;
    abstract resolveToExternalIdentifier(aid: AID): string;
}
export declare abstract class ArtifactFactory {
    #private;
    protected constructor(manager: ArtifactManager, artifactConstructor: Artifact.ClassConstructor, artifactResolver: ArtifactResolver, type?: string);
    get artifactConstructor(): Artifact.ClassConstructor;
    get type(): string;
    normalize(aid: AID): AID;
    make(aid: Artifact.Reference, ...extra: any): Artifact;
    makeFromNormalized(aid: AID, ...extra: any): Artifact;
    prependRequiredConstructorArgs(ref: Artifact.Reference, extraArgs?: any[]): any[];
    resolveToExternalIdentifier(aid: AID): string;
    get resolver(): ArtifactResolver;
    static get type(): string;
}
//# sourceMappingURL=artifact.d.ts.map