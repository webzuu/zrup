var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _PromiseKeeper_descriptors;
export class PromiseKeeper {
    constructor() {
        _PromiseKeeper_descriptors.set(this, {});
    }
    about(key, topic) {
        return this.retrieve(key, topic) || this.make(key, topic);
    }
    forget(key, topic) {
        const topicsForKey = __classPrivateFieldGet(this, _PromiseKeeper_descriptors, "f")[key];
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
        const topicsForKey = __classPrivateFieldGet(this, _PromiseKeeper_descriptors, "f")[key];
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
        if (!(key in __classPrivateFieldGet(this, _PromiseKeeper_descriptors, "f")))
            __classPrivateFieldGet(this, _PromiseKeeper_descriptors, "f")[key] = {};
        const topics = __classPrivateFieldGet(this, _PromiseKeeper_descriptors, "f")[key];
        if (topics && !(topic in topics))
            topics[topic] = descriptor;
        return descriptor;
    }
}
_PromiseKeeper_descriptors = new WeakMap();
//# sourceMappingURL=promise-keeper.js.map