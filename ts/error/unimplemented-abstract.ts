export class UnimplementedAbstract extends Error
{
    constructor()
    {
        super(`Unimplemented abstract`);
    }
}