import { Module } from "./module.js";
import { Graph } from "./graph.js";
export declare class Project {
    private $index;
    private readonly $rootDirectory;
    private readonly $graph;
    private $rootModule;
    constructor(rootDirectory: string);
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