var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Dependency_artifact, _Dependency_whenAbsent;
export class Dependency {
    constructor(artifact, whenAbsent) {
        _Dependency_artifact.set(this, void 0);
        _Dependency_whenAbsent.set(this, void 0);
        __classPrivateFieldSet(this, _Dependency_artifact, artifact, "f");
        __classPrivateFieldSet(this, _Dependency_whenAbsent, ("undefined" === typeof whenAbsent) ? Dependency.Absent.Violation : whenAbsent, "f");
    }
    get artifact() { return __classPrivateFieldGet(this, _Dependency_artifact, "f"); }
    get whenAbsent() { return __classPrivateFieldGet(this, _Dependency_whenAbsent, "f"); }
}
_Dependency_artifact = new WeakMap(), _Dependency_whenAbsent = new WeakMap();
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