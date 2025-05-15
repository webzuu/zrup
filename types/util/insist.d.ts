export type PromisePurpose = {
    kind: string;
    description: string;
} & {
    [key: string]: any;
};
export type PromiseStory = {
    promise: Promise<any>;
    purpose: PromisePurpose;
    requestedAt: number;
    settledAt?: number;
    error?: any;
};
export declare function insist<T>(promise: Promise<T>, purpose: string | PromisePurpose): Promise<T>;
export declare function dump(filepath: string): void;
//# sourceMappingURL=insist.d.ts.map