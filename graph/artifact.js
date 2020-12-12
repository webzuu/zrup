import md5 from "md5";

export class Artifact {
    constructor()
    {
    }

    /**
     * @return {string}
     */
    get type()
    {
        throw new Error(`Unimplemented abstract ${this.constructor.name}::get type()`);
    }

    static computeKey(type, identity)
    {
        return md5(JSON.stringify([
            ["type", type],
            ["identity", identity]
        ]))
    }

    /**
     * @return {string}
     */
    get key()
    {
        return Artifact.computeKey(this.type, this.identity);
    }

    /**
     * @return {Promise<string|null>}
     */
    get version()
    {
        throw new Error(`Unimplemented abstract ${this.constructor.name}::get version()`);
    }

    /**
     * @return {Promise<boolean>}
     */
    get exists()
    {
        throw new Error(`Unimplemented abstract ${this.constructor.name}::get exists()`);
    }

    /**
     * @return {string}
     */
    get identity()
    {
        throw new Error(`Unimplemented abstract ${this.constructor.name}::get identity()`);
    }

    get label()
    {
        return `${this.type} ${this.identity}`;
    }
}
