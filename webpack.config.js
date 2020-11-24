// This tool isn't actually built using webpack.
// This file only exists to help JetBrains IDEs recognize module aliases.

const path = require('path');

const moduleAliases = require('./package.json')._moduleAliases;
const alias = {};

for (const key in Object.getOwnPropertyNames(moduleAliases)) {
    alias[key] = path.resolve(__dirname, moduleAliases[key]);
}

module.exports = {
    resolve: {
        alias
    },
};