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
        return variable.map(v => reassemble(variableCallback, ["",""], v)).join(' ');
    }
    return variableCallback(variable);
}

/**
 * @param {templateVariableCallback} variableCallback
 * @param {string[]} strings
 * @param {...*} variables
 */
export function reassemble(variableCallback, strings, ...variables)
{
    const mapped = variables.map(v => stringifyUsing(variableCallback, v));
    const result = [strings[0]];
    for (let i=0; i<mapped.length; ++i) result.push(mapped[i]+strings[i+1]);
    return result.join('');
}

/**
 * @callback templateStringTag
 * @param {string[]} strings,
 * @param {...*} variables
 */

