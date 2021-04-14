export class UnsupportedOperation extends Error {
    constructor(className, methodName) {
        super(`Unsupported operation ${className}::${methodName}()`);
    }
}
//# sourceMappingURL=unsupported-operation.js.map