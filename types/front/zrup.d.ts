import { HyperVal } from 'hyperval';
import Config = Zrup.Config;
/***/
export declare class Zrup {
    #private;
    constructor(projectRoot: string, config: Zrup.Config, request: Zrup.Request);
    run(): Promise<void>;
    static init(absDirectory: string): Promise<void>;
    static loadConfig(fromWhere: string): Promise<Config>;
    static locateRoot(cwd: string): Promise<string>;
}
declare const schema_Config: import("hyperval").HyperObject<{
    zrupDir: import("hyperval").Hyper<string, string>;
    dataDir: import("hyperval").Hyper<string, string>;
    channels: import("hyperval").HyperRecord<import("hyperval").Hyper<string, string>, import("hyperval").Hyper<string, string>>;
}>, schema_RequestOptions: import("hyperval").HyperObject<{
    version: import("hyperval").Hyper<string, string>;
    init: import("hyperval").HyperOptional<import("hyperval").Hyper<boolean, boolean>>;
    verbose: import("hyperval").HyperOptional<import("hyperval").Hyper<boolean, boolean>>;
}>, schema_Request: import("hyperval").HyperObject<{
    goals: import("hyperval").HyperArray<import("hyperval").Hyper<string, string>>;
    options: import("hyperval").HyperObject<{
        version: import("hyperval").Hyper<string, string>;
        init: import("hyperval").HyperOptional<import("hyperval").Hyper<boolean, boolean>>;
        verbose: import("hyperval").HyperOptional<import("hyperval").Hyper<boolean, boolean>>;
    }>;
}>, schema_Options: import("hyperval").HyperObject<{
    goals: import("hyperval").HyperArray<import("hyperval").Hyper<string, string>>;
}>;
export declare namespace Zrup {
    type Config = HyperVal<typeof schema_Config>;
    type RequestOptions = HyperVal<typeof schema_RequestOptions>;
    type Request = HyperVal<typeof schema_Request>;
    type Options = HyperVal<typeof schema_Options>;
    const Schema: {
        Config: typeof schema_Config;
        RequestOptions: typeof schema_RequestOptions;
        Request: typeof schema_Request;
        Options: typeof schema_Options;
    };
}
export {};
//# sourceMappingURL=zrup.d.ts.map