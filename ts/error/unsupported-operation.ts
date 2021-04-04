export class UnsupportedOperation extends Error
{
    constructor(className: string, methodName: string)
    {
        super(`Unsupported operation ${className}::${methodName}`);
    }
}