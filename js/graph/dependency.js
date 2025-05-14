export class Dependency {
    constructor(artifact, whenAbsent) {
        this.$artifact = artifact;
        this.$whenAbsent = ("undefined" === typeof whenAbsent) ? Dependency.Absent.Violation : whenAbsent;
    }
    get artifact() { return this.$artifact; }
    get whenAbsent() { return this.$whenAbsent; }
}
Dependency.ABSENT_VIOLATION = 0;
Dependency.ABSENT_STATE = 1;
(function (Dependency) {
    let Absent;
    (function (Absent) {
        Absent[Absent["Violation"] = 0] = "Violation";
        Absent[Absent["State"] = 1] = "State";
    })(Absent = Dependency.Absent || (Dependency.Absent = {}));
})(Dependency || (Dependency = {}));
//# sourceMappingURL=dependency.js.map