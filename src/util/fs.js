/**
 * @param {string} path
 * @return {Promise<boolean>}
 */
import fs from "fs/promises";

import resolvePath from "better-path-resolve";


export async function is_there(path)
{
    try {
        await fs.access(path);
        return true;
    }
    catch(e) {
        return false;
    }
}

