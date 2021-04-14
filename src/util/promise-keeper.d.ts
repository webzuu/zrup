import Descriptor = PromiseKeeper.Descriptor;
export declare namespace PromiseKeeper {
    type Descriptor = {
        key: string;
        topic: string;
        resolve: Function;
        reject: Function;
        promise: Promise<any>;
        done: boolean;
        error: Error | null;
    };
}
export declare class PromiseKeeper {
    #private;
    about(key: string, topic: string): Descriptor;
    forget(key: string, topic: string): this;
    init(key: string, topic: string, value: any): void;
    set(key: string, topic: string, value: any): void;
    private retrieve;
    make(key: string, topic: string): PromiseKeeper.Descriptor;
    private store;
}
//# sourceMappingURL=promise-keeper.d.ts.map