// This tool isn't actually built using webpack.
// This file only exists to help JetBrains IDEs recognize module aliases.

const path = require('path');
const fs = require('fs');

const moduleAliases = JSON.parse(fs.readFileSync('./package.json','utf-8'))._moduleAliases;
const alias = {};

for (const key of Object.getOwnPropertyNames(moduleAliases)) {
    alias[key] = path.resolve(__dirname, moduleAliases[key]);
}
module.exports = {
    resolve: {
        alias
    }
};
