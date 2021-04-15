class __emptyClassWorkaround {}
type E<T> = T | __emptyClassWorkaround;
export type ValueOrArray<T> = E<T> | ValueOrArray<T>[];
