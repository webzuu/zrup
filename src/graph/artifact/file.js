import Artifact from "@zrup/graph/artifact";
import md5 from "md5";
import fs from "fs";
const fsp = fs.promises;

export default class FileArtifact extends Artifact {
    #path;
    #key;
    #resolvedPath;

    /**
     *
     * @param {string} path
     * @param {string} resolvedPath
     */
    constructor(path, resolvedPath) {
        super();
        this.#path = path;
        this.#key = md5(path);
        this.#resolvedPath = resolvedPath;
    }

    get type()
    {
        return "file";
    }

    get exists()
    {
        return Promise.resolve(fs.existsSync(this.#resolve.call(null,this.#path)));
    }

    get version()
    {
        return (async () => md5(fsp.readFile(this.#resolvedPath)))();
    }

    get identity()
    {
        return this.#path;
    }


    get contents()
    {
        return (async () => await fsp.readFile(this.#resolvedPath))();
    }
}