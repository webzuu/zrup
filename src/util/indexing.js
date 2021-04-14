import inspect from "object-inspect";
export function uniqueAdd(map, key, value, indexName) {
    if (map.has(key)) {
        throw new Error([
            `Unique violation adding key ${key} to ${indexName || 'index'}`,
            `Value being added:\n ${inspect(value)}`
        ].join("\n"));
    }
    map.set(key, value);
}
//# sourceMappingURL=indexing.js.map