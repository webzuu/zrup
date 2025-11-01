# zrup

Zrup is an experimental general-purpose build system designed primarily for local development work, and therefore optimized for handling the "build" part of a tight code-build-test-debug cycle.

Features:
 - unopinionated, to the point of allowing the dependency specification to be incomplete at user's responsibility
 - no sandboxing - every recipe can read and write everywhere in the filesystem
 - based on a set of primitives that handle 99% of use cases but can be extended
 - uses content hashes, not timestamps
 - stores build records in a database
 - uses a uniform way of referring to artifacts
 - supports primitives that make it feasible to implement both autodependencies and auto-outputs, as long as the targeted build tool is capable of enumerating those somehow
 - combined with tree-utils (which have been developed in parallel with it), it is possible to specify dependency sets using glob expressions, and to use git for speeding up detection of changes in large sets of files thus specified

## Documentation

Comprehensive documentation for buildspec writers is available in the [doc](doc/) directory:

- **[Getting Started](doc/README.md)** - Documentation index and learning path
- **[Tutorial Series](doc/README.md#for-new-users)** - Step-by-step tutorials (001-005)
- **[Buildspec Writer's Guide](doc/buildspec-writers-guide.md)** - Comprehensive guide with best practices
- **[Buildspec Reference](doc/buildspec-reference.md)** - Complete API reference
- **[Practical Examples](doc/practical-examples.md)** - Real-world buildspec examples

## Quick Start

Initialize a zrup project:
```bash
zrup --init
```

Create a `.zrup.mjs` file:
```javascript
/** @type {ModuleBuilder.definer} */
const myProject = async function myProject({to, produces, T}) {
    to("hello", () => T`echo "Hello from zrup!" > ${produces('hello.txt')}`);
}
export default myProject;
```

Build your target:
```bash
zrup hello.txt
```

## Self-Building

How to self-zrup this project:
```bash
node js/front/runner.js internal:all
```
