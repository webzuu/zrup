export declare type templateVariableCallback = (item: any) => string;
export declare type StringArrayWithRaws = string[] & {
    raw: string[];
};
export declare type templateStringTag = (strings: StringArrayWithRaws, ...variables: any[]) => any;
export declare function stringifyUsing(variableCallback: templateVariableCallback, variable: any): string | object;
export declare function reassemble(variableCallback: templateVariableCallback, strings: StringArrayWithRaws, ...variables: any[]): string;
//# sourceMappingURL=tagged-template.d.ts.map