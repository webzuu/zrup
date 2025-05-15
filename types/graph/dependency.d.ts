import { Artifact } from "./artifact.js";
export declare class Dependency {
    private readonly $artifact;
    private readonly $whenAbsent;
    constructor($artifact: Artifact, $whenAbsent?: Dependency.Absent);
    get artifact(): Artifact;
    get whenAbsent(): Dependency.Absent;
    static readonly ABSENT_VIOLATION = 0;
    static readonly ABSENT_STATE = 1;
}
export declare namespace Dependency {
    enum Absent {
        Violation,
        State
    }
}
//# sourceMappingURL=dependency.d.ts.map