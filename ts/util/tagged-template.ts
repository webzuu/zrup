export type templateVariableCallback = (item: any) => string;
export type StringArrayWithRaws = string[] & { raw: string[] };
export type templateStringTag = (strings: StringArrayWithRaws, ...variables: any[]) => any;

export function stringifyUsing(variableCallback : templateVariableCallback, variable: any) : string|object
{
    if (Array.isArray(variable)) {
        return (variable
            .map(v => reassemble(
                variableCallback,
                Object.assign(["",""], { raw: ["",""] }),
                v
            ))
            .join(' '));
    }
    return variableCallback(variable);
}

export function reassemble(
    variableCallback: templateVariableCallback,
    strings: StringArrayWithRaws,
    ...variables: any[]
) : string
{
    const result = [];
    const raw = strings.raw;
    for(let i=0, ii = variables.length; i < ii; ++i) {
        const rawItem = raw[i] || '';
        const withoutHash = rawItem.replace(/(\\*)#$/, '');
        if (withoutHash === rawItem) {
            result.push(rawItem, stringifyUsing(variableCallback, variables[i]).toString())
            continue;
        }
        const numBackslashes = rawItem.length - withoutHash.length - 1;
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

