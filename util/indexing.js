import inspect from "object-inspect";

/**
 *
 * @param {Map} map
 * @param key
 * @param value
 * @param indexName
 */
export function uniqueAdd(map, key, value, indexName)
{
    if (map.has(key)) {
        throw [
            `Unique violation adding key ${key} to ${indexName || 'index'}`,
            `Value being added:\n ${inspect(value)}`
        ].join("\n");
    }
    map.set(key, value);
}
