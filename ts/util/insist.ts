import fs from "fs";

export type PromisePurpose = { kind: string, description: string } & { [key: string]: any };

export type PromiseStory = {
    promise: Promise<any>,
    purpose: PromisePurpose
    requestedAt: number,
    settledAt?: number,
    error?: any
}

const registry = {
    incident: 0,
    promises: new Map<Promise<any>, PromiseStory[]>
}

export async function insist<T>(promise: Promise<T>, purpose: string | PromisePurpose) : Promise<T>
{
    const story = register(promise, purpose);
    let result: T;
    try {
        return succeed(story, await promise);
    }
    catch (e) {
        throw fail(story, e);
    }
}

function register<T>(promise: Promise<T>, purpose: string | PromisePurpose) : PromiseStory
{
    const story : PromiseStory = {
        promise,
        purpose: 'string' === typeof purpose ? { kind: 'unspecified', description: purpose } : purpose,
        requestedAt: ++registry.incident
    }
    const stories : PromiseStory[] = registry.promises.get(promise) || [];
    stories.push(story);
    registry.promises.set(promise, stories);
    return story;
}

function succeed<T>(story: PromiseStory, result: T) : T
{
    story.settledAt = ++registry.incident;
    return result;
}

function fail<T, E>(story: PromiseStory, error: E) : E
{
    story.error = error;
    story.settledAt = ++registry.incident;
    return error;
}

export function dump(filepath: string) : void
{
    const pairs : [Promise<any>, PromiseStory[]][] = [...registry.promises.entries()];
    pairs.forEach(([promise, stories]) => {
        stories.sort((a, b) => a.requestedAt - b.requestedAt);
    })
    pairs.sort((a, b) => a[1][0]!.requestedAt - b[1][0]!.requestedAt);
    const items = pairs.map(([promise, stories]) => [
        `${stories[0]!.requestedAt}:${stories[0]!.settledAt ?? 'pending'} ${stories[0]!.purpose.kind}`,
        ...stories.map(story => [
            `  ${story.requestedAt}:${story.settledAt ?? 'pending'} ${story.purpose.kind}`,
            `    ${story.purpose.description}`,
            `    ${story.error ? story.error.toString() : ''}`
        ])
    ]);
    fs.writeFileSync(filepath, items.flat().join('\n'), 'utf-8');
}