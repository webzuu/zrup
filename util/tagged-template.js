/**
 * @callback templateVariableCallback
 * @param {*} item
 * @return {string}
 */

/**
 * @param {templateVariableCallback} variableCallback
 * @param {*} variable
 */
export function stringifyUsing(variableCallback, variable)
{
    if (Array.isArray(variable)) {
        const strings = ["",""];
        strings.raw = ["",""];
        return variable.map(v => reassemble(variableCallback, strings, v)).join(' ');
    }
    return variableCallback(variable);
}

/**
 * @param {templateVariableCallback} variableCallback
 * @param {(string[] & {raw: string[]})} strings
 * @param {...*} variables
 */
export function reassemble(variableCallback, strings, ...variables)
{
    const result = [];
    const raw = strings.raw;
    for(let i=0, ii = variables.length; i < ii; ++i) {
        const withoutHash = raw[i].replace(/(\\*)#$/, '');
        if (withoutHash === raw[i]) {
            result.push(raw[i], stringifyUsing(variableCallback, variables[i]).toString())
            continue;
        }
        const numBackslashes = raw[i].length - withoutHash.length - 1;
        result.push(withoutHash, '\\'.repeat(numBackslashes >> 1));
        if (0 === numBackslashes % 2) { //even number of slashes, hash was unescaped
            result.push(
                ('string' === typeof variables[i])
                    ? variables[i]
                    : stringifyUsing(variableCallback, variables[i]).toString()
            );
        } else { //odd number of slashes, hash was escaped
            result.push('#', stringifyUsing(variableCallback, variables[i]).toString());
        }
    }
    result.push(raw[raw.length - 1]);
    return result.join('');
}

/**
 * @callback templateStringTag
 * @param {string[]} strings,
 * @param {...*} variables
 */

