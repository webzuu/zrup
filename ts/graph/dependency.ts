import {Artifact} from "./artifact";

export class Dependency
{
    readonly #artifact : Artifact;
    readonly #whenAbsent;

    constructor(artifact : Artifact, whenAbsent: Dependency.Absent)
    {
        this.#artifact = artifact;
        this.#whenAbsent = ("undefined" === typeof whenAbsent) ? Dependency.Absent.Violation : whenAbsent;
    }

    get artifact() { return this.#artifact; }
    get whenAbsent() { return this.#whenAbsent; }

    static readonly ABSENT_VIOLATION = 0;
    static readonly ABSENT_STATE = 1;
}

export namespace Dependency {
    export enum Absent {
        Violation,
        State
    }
}

