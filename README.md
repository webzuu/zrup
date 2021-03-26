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
