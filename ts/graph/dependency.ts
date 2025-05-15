import {Artifact} from "./artifact.js";

export class Dependency
{
   constructor(
        private readonly $artifact : Artifact,
        private readonly $whenAbsent: Dependency.Absent = Dependency.Absent.Violation
    ) {}

    get artifact() { return this.$artifact; }
    get whenAbsent() { return this.$whenAbsent; }

    static readonly ABSENT_VIOLATION = 0;
    static readonly ABSENT_STATE = 1;
}

export namespace Dependency {
    export enum Absent {
        Violation       = Dependency.ABSENT_VIOLATION,
        State           = Dependency.ABSENT_STATE
    }
}

