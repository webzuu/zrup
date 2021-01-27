export const UnimplementedAbstract = class UnimplementedAbstract extends Error

{
    constructor()
    {
        super(`Unimplemented abstract`);
    }
}