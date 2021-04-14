var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _descriptors;
export class PromiseKeeper {
    constructor() {
        _descriptors.set(this, {});
    }
    about(key, topic) {
        return this.retrieve(key, topic) || this.make(key, topic);
    }
    forget(key, topic) {
        const topicsForKey = __classPrivateFieldGet(this, _descriptors)[key];
        if (topicsForKey) {
            delete topicsForKey[topic];
        }
        return this;
    }
    init(key, topic, value) {
        const descriptor = this.about(key, topic);
        if (!descriptor.done) {
            descriptor[value instanceof Error ? 'reject' : 'resolve'].call(null, value);
        }
    }
    set(key, topic, value) {
        this.forget(key, topic);
        this.init(key, topic, value);
    }
    retrieve(key, topic) {
        const topicsForKey = __classPrivateFieldGet(this, _descriptors)[key];
        if (topicsForKey) {
            if (!(topic in topicsForKey))
                return null;
            return topicsForKey[topic] || null;
        }
        return null;
    }
    make(key, topic) {
        const descriptor = {
            key,
            topic,
            done: false,
            error: null
        };
        descriptor.promise = new Promise((resolve, reject) => {
            descriptor.resolve = resolve;
            descriptor.reject = reject;
        });
        descriptor.promise.then(v => { descriptor.done = true; return v; }).catch(e => { descriptor.error = e; throw e; });
        return this.store(descriptor);
    }
    store(descriptor) {
        const { key, topic } = descriptor;
        if (!(key in __classPrivateFieldGet(this, _descriptors)))
            __classPrivateFieldGet(this, _descriptors)[key] = {};
        const topics = __classPrivateFieldGet(this, _descriptors)[key];
        if (topics && !(topic in topics))
            topics[topic] = descriptor;
        return descriptor;
    }
}
_descriptors = new WeakMap();
//# sourceMappingURL=promise-keeper.js.map