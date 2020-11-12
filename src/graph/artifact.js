import md5 from "md5";

export default class Artifact {
    constructor() {}

    /**
     * @return {string}
     */
    get type() {
        throw new Error(`Unimplemented abstract ${this.constructor.name}::get type()`);
    }

    /**
     * @return {string}
     */
    get key() {
        return md5(JSON.stringify({
            type: this.type,
            identity: this.identity
        }))
    }

    /**
     * @return {Promise<string|null>}
     */
    get version() {
        throw new Error(`Unimplemented abstract ${this.constructor.name}::get version()`);
    }

    /**
     * @return {Promise<boolean>}
     */
    get exists() {
        throw new Error(`Unimplemented abstract ${this.constructor.name}::get exists()`);
    }

    /**
     * @return {string}
     */
    get identity() {
        throw new Error(`Unimplemented abstract ${this.constructor.name}::get identity()`);
    }

    get label()
    {
        return `${this.type} ${this.identity}`;
    }
}
