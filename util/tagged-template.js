/**
 * @callback templateVariableCallback
 * @param {*} item
 * @return {string}
 */

/**
 * @param {templateVariableCallback} variableCallback
 * @param strings
 * @param variables
 */
export function reassemble(variableCallback, strings, ...variables)
{
    const mapped = variables.map(variableCallback);
    const result = [strings[0]];
    for (let i=0; i<mapped.length; ++i) result.push(mapped[i]+strings[i+1]);
    return result.join('');
}

/**
 * @callback templateStringTag
 * @param {string[]} strings,
 * @param {...*} variables
 */

