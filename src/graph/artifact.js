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
        throw new Error(`Unimplemented abstract ${this.constructor.name}::get key()`);
    }
}

/**
 *
 * @type {Artifact.File}
 * @property {string} path
 */
Artifact.File = class File extends Artifact {

    constructor(path) {
        super();
        this.path = path;
    }

    get type() { return "file"; }
}