# Zrup Documentation Index

Welcome to the zrup documentation! This index will help you find the right documentation for your needs.

## For New Users

Start here if you're new to zrup:

1. **[Tutorial 001: Hello](tutorial/001-hello.md)**  
   Introduction to zrup modules, rules, and basic build concepts. Create your first buildspec.

2. **[Tutorial 002: Command Template Tag](tutorial/002-command-template-tag.md)**  
   Learn to use the `T` template tag for cleaner, more concise buildspecs.

3. **[Tutorial 003: Artifacts and Channels](tutorial/003-artifacts-and-channels.md)**  
   Understand artifact identifiers, channels, and how dependencies work.

4. **[Tutorial 004: Advanced Rule Patterns](tutorial/004-advanced-rule-patterns.md)**  
   Master `after()`, `also()`, `always()`, working directories, and output redirection.

5. **[Tutorial 005: Working with Recipes](tutorial/005-working-with-recipes.md)**  
   Dive deep into CommandRecipe, WrapperRecipe, DelayedRecipe, and custom recipes.

## For Experienced Users

### Quick References

- **[Buildspec Reference Guide](buildspec-reference.md)**  
  Complete API reference: module definer API, rule definer API, recipe descriptors, artifact formats, and more.

- **[Buildspec Writer's Guide](buildspec-writers-guide.md)**  
  Comprehensive guide covering core concepts, best practices, debugging techniques, and advanced topics.

- **[Practical Examples](practical-examples.md)**  
  Real-world buildspec examples: TypeScript projects, monorepos, C++ builds, Docker, frontend apps, databases, code generation, deployments, and more.

### By Topic

#### Module Organization
- [Tutorial 001](tutorial/001-hello.md#modules) - Module basics
- [Tutorial 003](tutorial/003-artifacts-and-channels.md#practical-examples) - Multi-module builds
- [Buildspec Writer's Guide](buildspec-writers-guide.md#organize-with-modules) - Module organization patterns

#### Artifact Management
- [Tutorial 003](tutorial/003-artifacts-and-channels.md) - Complete guide to artifacts and channels
- [Buildspec Reference](buildspec-reference.md#artifact-references) - Artifact reference formats
- [Buildspec Writer's Guide](buildspec-writers-guide.md#3-artifact-management) - Best practices

#### Rule Definition
- [Tutorial 001](tutorial/001-hello.md#rules) - Basic rules
- [Tutorial 002](tutorial/002-command-template-tag.md) - Concise rule syntax
- [Tutorial 004](tutorial/004-advanced-rule-patterns.md) - Advanced patterns
- [Buildspec Reference](buildspec-reference.md#module-definer-api) - Complete API

#### Dependencies
- [Tutorial 001](tutorial/001-hello.md#specifying-rule-inputs) - Basic dependencies
- [Tutorial 003](tutorial/003-artifacts-and-channels.md#the-depends-function) - Dependency patterns
- [Buildspec Writer's Guide](buildspec-writers-guide.md#handle-complex-dependencies) - Complex dependency patterns

#### Recipes
- [Tutorial 005](tutorial/005-working-with-recipes.md) - Complete recipe guide
- [Buildspec Reference](buildspec-reference.md#advanced-recipes) - Recipe API reference
- [Buildspec Writer's Guide](buildspec-writers-guide.md#custom-recipes) - Custom recipes

#### Build Optimization
- [Tutorial 003](tutorial/003-artifacts-and-channels.md#use-channels-effectively) - Using channels efficiently
- [Tutorial 004](tutorial/004-advanced-rule-patterns.md#always-run-rules-the-always-function) - When to use `always()`
- [Buildspec Writer's Guide](buildspec-writers-guide.md#implement-incremental-builds) - Incremental build patterns
- [Buildspec Writer's Guide](buildspec-writers-guide.md#5-performance) - Performance best practices

#### Build Stages and Ordering
- [Tutorial 004](tutorial/004-advanced-rule-patterns.md#rule-ordering-the-after-function) - Rule ordering with `after()`
- [Tutorial 004](tutorial/004-advanced-rule-patterns.md#side-effect-rules-the-also-function) - Side effects with `also()`
- [Buildspec Writer's Guide](buildspec-writers-guide.md#manage-build-stages) - Multi-stage builds

#### Command Construction
- [Tutorial 002](tutorial/002-command-template-tag.md) - Template tag basics
- [Tutorial 004](tutorial/004-advanced-rule-patterns.md#output-redirection) - Output redirection
- [Buildspec Reference](buildspec-reference.md#template-tag) - Template tag reference
- [Buildspec Writer's Guide](buildspec-writers-guide.md#4-command-construction) - Best practices

#### Error Handling
- [Tutorial 005](tutorial/005-working-with-recipes.md#wrapperrecipe) - Using WrapperRecipe for hooks
- [Buildspec Writer's Guide](buildspec-writers-guide.md#handle-errors-gracefully) - Error handling patterns

#### Debugging
- [Buildspec Writer's Guide](buildspec-writers-guide.md#debugging-buildspecs) - Debugging guide
- [Buildspec Writer's Guide](buildspec-writers-guide.md#common-issues) - Common issues and solutions

## API Documentation

For detailed API documentation with type information, see the TypeDoc-generated documentation in `doc/td/`.

## Quick Start Checklist

Getting started with zrup? Follow this checklist:

- [ ] Read [Tutorial 001: Hello](tutorial/001-hello.md) to understand basic concepts
- [ ] Initialize your project with `zrup --init`
- [ ] Create a `.zrup.mjs` file with a simple module
- [ ] Define your first rule using `to()`
- [ ] Build your first target with `zrup <target>`
- [ ] Read [Tutorial 002](tutorial/002-command-template-tag.md) to simplify your rules
- [ ] Read [Tutorial 003](tutorial/003-artifacts-and-channels.md) to understand artifact references
- [ ] Explore [Tutorial 004](tutorial/004-advanced-rule-patterns.md) for more control
- [ ] Consult the [Reference Guide](buildspec-reference.md) when you need API details
- [ ] Use the [Writer's Guide](buildspec-writers-guide.md) for best practices

## Common Recipes

Quick links to common buildspec patterns:

- [Simple file copy](tutorial/001-hello.md#specifying-rule-inputs)
- [Multi-file concatenation](tutorial/004-advanced-rule-patterns.md#practical-examples)
- [Multi-module build](tutorial/003-artifacts-and-channels.md#example-1-multi-module-build)
- [Incremental build with fingerprinting](buildspec-writers-guide.md#implement-incremental-builds)
- [Multi-stage pipeline](tutorial/004-advanced-rule-patterns.md#example-1-complex-build-pipeline)
- [Build with different working directories](tutorial/004-advanced-rule-patterns.md#example-3-multi-stage-build-with-different-working-directories)
- [Error handling with retries](buildspec-writers-guide.md#handle-errors-gracefully)

## Real-World Examples

See **[Practical Examples](practical-examples.md)** for complete real-world buildspecs:

- TypeScript + Node.js project
- Monorepo with multiple packages
- C/C++ project with CMake
- Docker multi-stage builds
- Frontend build with asset processing
- Database migrations
- Code generation workflows
- Multi-environment deployments
- Testing at scale
- Documentation generation

## Getting Help

If you can't find what you're looking for:

1. Check the [Reference Guide](buildspec-reference.md) for API details
2. Look at examples in the tutorial series
3. Consult the [Writer's Guide](buildspec-writers-guide.md) for patterns and best practices
4. Search the TypeDoc API documentation in `doc/td/`

## Contributing to Documentation

Found an error or want to improve the documentation? The documentation source files are:

- Tutorials: `doc/tutorial/*.md`
- Guides: `doc/*.md`
- This index: `doc/README.md`

## Next Steps

Choose your path:

- **Learning zrup:** Start with [Tutorial 001](tutorial/001-hello.md)
- **Quick reference:** Jump to the [Buildspec Reference](buildspec-reference.md)
- **Deep dive:** Read the [Buildspec Writer's Guide](buildspec-writers-guide.md)
- **API details:** Browse the TypeDoc documentation in `doc/td/`
