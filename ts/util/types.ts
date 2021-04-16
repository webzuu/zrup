class __emptyClassWorkaround {}
export type EmptyWorkaround<T> = T | __emptyClassWorkaround;
export type ValueOrArray<T> = T | ValueOrArray<T>[];
