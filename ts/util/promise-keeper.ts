import Descriptor = PromiseKeeper.Descriptor;

export namespace PromiseKeeper {
    export type Descriptor = {
        key: string,
        topic: string,
        resolve: Function,
        reject: Function,
        promise: Promise<any>,
        done: boolean,
        error: Error|null
    }
}

export class PromiseKeeper  {

    #descriptors : Record<string, Record<string,Descriptor>> = {};

    about(key: string, topic: string): Descriptor
    {
        return this.retrieve(key, topic) || this.make(key, topic);
    }

    forget(key: string, topic: string) : this
    {
        const topicsForKey = this.#descriptors[key];
        if (topicsForKey) {
            delete topicsForKey[topic];
        }
        return this;
    }

    init(key: string, topic: string, value: any)
    {
        const descriptor = this.about(key, topic);
        if (!descriptor.done) {
            descriptor[value instanceof Error ? 'reject' : 'resolve'].call(null,value);
        }
    }

    set(key: string, topic: string, value: any)
    {
        this.forget(key, topic);
        this.init(key, topic, value);
    }

    private retrieve(key: string, topic: string): (PromiseKeeper.Descriptor | null) {
        const topicsForKey = this.#descriptors[key];
        if (topicsForKey) {
            if (!(topic in topicsForKey)) return null;
            return topicsForKey[topic] || null;
        }
        return null;
    }

    make(key: string, topic: string): PromiseKeeper.Descriptor {
        const descriptor : Partial<Descriptor> = {
            key,
            topic,
            done: false,
            error: null
        };
        descriptor.promise = new Promise(
            (resolve: Function, reject: Function) => {
                descriptor.resolve = resolve;
                descriptor.reject = reject;
            }
        );
        descriptor.promise.then(v => { descriptor.done = true; return v; }).catch(e => { descriptor.error=e; throw e; });
        return this.store(descriptor as Descriptor);
    }

    private store(descriptor: PromiseKeeper.Descriptor): PromiseKeeper.Descriptor
    {
        const {key, topic} = descriptor;
        if (!(key in this.#descriptors)) this.#descriptors[key] = {};
        const topics = this.#descriptors[key];
        if (topics && !(topic in topics)) topics[topic] = descriptor;
        return descriptor;
    }
}