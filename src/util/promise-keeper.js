export default class PromiseKeeper {

    #descriptors = {};

    about(key, topic)
    {
        return this.#retrieve(key, topic) || this.#make(key, topic);
    }

    #retrieve(key, topic)
    {
        if(!(key in this.#descriptors)) return null;
        if (!(topic in this.#descriptors[key])) return null;
        return this.#descriptors[key][topic];
    }

    #make(key, topic) {
        const descriptor = {
            key,
            topic,
            resolve: null,
            reject: null,
            promise: null,
        };
        descriptor.promise = new Promise((resolve, reject) => {
            descriptor.resolve = resolve;
            descriptor.reject = reject;
        });
        this.#store(descriptor);
        return descriptor;
    }

    #store(descriptor)
    {
        const {key, topic} = descriptor;
        if (!(key in this.#descriptors)) this.#descriptors[key] = {}
        if (!(topic in this.#descriptors[key])) this.#descriptors[key][topic] = descriptor;
    }
}