/**
 * @param {string} path
 * @return {Promise<boolean>}
 */
import fs from "fs/promises";

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

