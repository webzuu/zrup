declare class __emptyClassWorkaround {
}
declare type E<T> = T | __emptyClassWorkaround;
export declare type ValueOrArray<T> = E<T> | ValueOrArray<T>[];
export {};
//# sourceMappingURL=types.d.ts.map