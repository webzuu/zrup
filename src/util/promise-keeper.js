/**
 * @typedef {Object} PromiseKeeper~Descriptor
 * @property {string} key
 * @property {string} topic
 * @property {Function} resolve
 * @property {Function} reject
 * @property {Promise<*>} promise
 * @property {boolean} done
 * @property {Error|null} error
 */

export const PromiseKeeper = class PromiseKeeper  {

    #descriptors = {};

    /**
     * @param key
     * @param topic
     * @return {PromiseKeeper~Descriptor}
     */
    about(key, topic)
    {
        return this.#retrieve(key, topic) || this.#make(key, topic);
    }

    forget(key, topic)
    {
        if (!(key in this.#descriptors)) return this;
        if (!(topic in this.#descriptors[key])) return this;
        delete this.#descriptors[key][topic];
        return this;
    }

    init(key, topic, value)
    {
        const descriptor = this.about(key, topic);
        if (!descriptor.done) {
            descriptor[value instanceof Error ? 'reject' : 'resolve'].call(null,value);
        }
    }

    set(key, topic, value)
    {
        this.forget(key, topic);
        this.init(key, topic, value);
    }

    #retrieve(key, topic)
    {
        if(!(key in this.#descriptors)) return null;
        if (!(topic in this.#descriptors[key])) return null;
        return this.#descriptors[key][topic];
    }

    /**
     * @param {string} key
     * @param {string} topic
     * @return {PromiseKeeper~Descriptor}
     */
    #make(key, topic) {
        const descriptor = {
            key,
            topic,
            resolve: null,
            reject: null,
            promise: null,
            done: false,
            error: null
        };
        descriptor.promise = new Promise(
            /**
             * @param {Function} resolve
             * @param {Function} reject
             */
            (resolve, reject) => {
                descriptor.resolve = resolve;
                descriptor.reject = reject;
            }
        );
        descriptor.promise.then(v => { descriptor.done = true; return v; }).catch(e => { descriptor.error=e; throw e; });
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