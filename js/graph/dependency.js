export class Dependency {
    constructor($artifact, $whenAbsent = Dependency.Absent.Violation) {
        this.$artifact = $artifact;
        this.$whenAbsent = $whenAbsent;
    }
    get artifact() { return this.$artifact; }
    get whenAbsent() { return this.$whenAbsent; }
}
Dependency.ABSENT_VIOLATION = 0;
Dependency.ABSENT_STATE = 1;
(function (Dependency) {
    let Absent;
    (function (Absent) {
        Absent[Absent["Violation"] = Dependency.ABSENT_VIOLATION] = "Violation";
        Absent[Absent["State"] = Dependency.ABSENT_STATE] = "State";
    })(Absent = Dependency.Absent || (Dependency.Absent = {}));
})(Dependency || (Dependency = {}));
//# sourceMappingURL=dependency.js.map