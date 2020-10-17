import fs from "fs";
import path from "path";

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const aliases = JSON.parse(fs.readFileSync(__dirname + '/package.json','utf-8'))._moduleAliases;

export async function resolve(specifier, context, defaultResolve) {
    const noExtension = specifier.replace(/\.m?js$/,'');
    const [a,...rest] = noExtension.split('/');
    for(let alias of Object.getOwnPropertyNames(aliases)) {
        if (a === alias) {
            return {
                url: new URL('file://localhost' + path.join(__dirname, aliases[a],...rest)+'.js').href
            }
        }
    }
    return defaultResolve(specifier, context, defaultResolve);
}