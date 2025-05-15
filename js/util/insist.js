import fs from "fs";
const registry = {
    incident: 0,
    promises: new Map
};
export async function insist(promise, purpose) {
    const story = register(promise, purpose);
    let result;
    try {
        return succeed(story, await promise);
    }
    catch (e) {
        throw fail(story, e);
    }
}
function register(promise, purpose) {
    const story = {
        promise,
        purpose: 'string' === typeof purpose ? { kind: 'unspecified', description: purpose } : purpose,
        requestedAt: ++registry.incident
    };
    const stories = registry.promises.get(promise) || [];
    stories.push(story);
    registry.promises.set(promise, stories);
    return story;
}
function succeed(story, result) {
    story.settledAt = ++registry.incident;
    return result;
}
function fail(story, error) {
    story.error = error;
    story.settledAt = ++registry.incident;
    return error;
}
export function dump(filepath) {
    const pairs = [...registry.promises.entries()];
    pairs.forEach(([promise, stories]) => {
        stories.sort((a, b) => a.requestedAt - b.requestedAt);
    });
    pairs.sort((a, b) => a[1][0].requestedAt - b[1][0].requestedAt);
    const items = pairs.map(([promise, stories]) => [
        `${stories[0].requestedAt}:${stories[0].settledAt ?? 'pending'} ${stories[0].purpose.kind}`,
        ...stories.map(story => [
            `  ${story.requestedAt}:${story.settledAt ?? 'pending'} ${story.purpose.kind}`,
            `    ${story.purpose.description}`,
            `    ${story.error ? story.error.toString() : ''}`
        ])
    ]);
    fs.writeFileSync(filepath, items.flat().join('\n'), 'utf-8');
}
//# sourceMappingURL=insist.js.map