import { Module } from "./module";
import { Graph } from "./graph";
export declare class Project {
    #private;
    constructor(rootDirectory: string);
    /** @return {Graph} */
    get graph(): Graph;
    addModule(module: Module): Module;
    getModuleByName(name: string, require?: boolean): Module | null;
    requireModuleByName(name: string): Module;
    get allModules(): Module[];
    getModuleByPath(path: string): Module | null;
    get rootModule(): Module | null;
    get path(): string;
}
//# sourceMappingURL=project.d.ts.map