import { Artifact } from "../artifact.js";
export declare class ArtifactList extends Artifact {
    private $items;
    private $versionCache;
    constructor(identity: string);
    get type(): string;
    get items(): Artifact[];
    set items(items: Artifact[]);
    get version(): Promise<string>;
    set version(versionPromise: Promise<string>);
    getVersionUsing(algorithm: string): Promise<string>;
    private computeVersion;
    get exists(): Promise<boolean>;
    rm(): Promise<void>;
}
//# sourceMappingURL=artifact-list.d.ts.map