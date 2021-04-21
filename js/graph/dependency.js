var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _artifact, _whenAbsent;
export class Dependency {
    constructor(artifact, whenAbsent) {
        _artifact.set(this, void 0);
        _whenAbsent.set(this, void 0);
        __classPrivateFieldSet(this, _artifact, artifact);
        __classPrivateFieldSet(this, _whenAbsent, ("undefined" === typeof whenAbsent) ? Dependency.Absent.Violation : whenAbsent);
    }
    get artifact() { return __classPrivateFieldGet(this, _artifact); }
    get whenAbsent() { return __classPrivateFieldGet(this, _whenAbsent); }
}
_artifact = new WeakMap(), _whenAbsent = new WeakMap();
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