# Practical Examples

This document provides real-world examples of common build scenarios using zrup.

## Example 1: TypeScript + Node.js Project

A complete buildspec for a TypeScript Node.js application with tests and documentation.

```javascript
/** @type {ModuleBuilder.definer} */
const project = async function project({to, always, depends, produces, resolve, T}) {
    
    // Install dependencies
    to("install", () => {
        depends("package.json", "package-lock.json");
        return T`npm ci && touch ${produces('internal:installed')}`;
    });
    
    // Fingerprint TypeScript sources
    to("source-fingerprint", () => {
        always();
        depends("internal:installed");
        return T`find src -name "*.ts" | sort | xargs md5sum > ${produces('internal:source-fp')}`;
    });
    
    // Compile TypeScript
    to("compile", () => {
        depends("internal:source-fp", "tsconfig.json");
        return {
            cmd: "tsc",
            out: produces("internal:compile-log.txt"),
            err: produces("internal:compile-errors.txt")
        };
    });
    
    // Mark compilation complete
    to("compile-marker", () => {
        depends("internal:compile-log.txt");
        return T`touch ${produces('internal:compiled')}`;
    });
    
    // Run tests
    to("test", () => {
        depends("internal:compiled");
        return {
            cmd: "npm test",
            combined: produces("test-results.txt")
        };
    });
    
    // Generate documentation
    to("docs", () => {
        depends("internal:source-fp");
        return T`npx typedoc --out docs src && touch ${produces('internal:docs-built')}`;
    });
    
    // Build everything
    to("all", () => {
        depends("test-results.txt", "internal:docs-built");
        return T`echo "Build complete" > ${produces('internal:all')}`;
    });
}
export default project;
```

## Example 2: Monorepo with Multiple Packages

A monorepo with shared libraries and applications.

```javascript
// Root .zrup.mjs
/** @type {ModuleBuilder.definer} */
const monorepo = async function monorepo({include, to, depends, produces, T}) {
    
    await include('packages/shared', 'packages/api', 'packages/web');
    
    to("install-root", () => {
        depends("package.json");
        return T`npm install && touch ${produces('internal:root-installed')}`;
    });
    
    to("all", () => {
        depends(
            "internal:shared+built",
            "internal:api+built",
            "internal:web+built"
        );
        return T`echo "All packages built" > ${produces('internal:all')}`;
    });
    
    to("test-all", () => {
        depends(
            "shared+test-results.txt",
            "api+test-results.txt",
            "web+test-results.txt"
        );
        return T`echo "All tests passed" > ${produces('test-summary.txt')}`;
    });
}
export default monorepo;
```

```javascript
// packages/shared/.zrup.mjs
/** @type {ModuleBuilder.definer} */
const shared = async function shared({to, depends, produces, T}) {
    
    to("build", () => {
        depends("internal:zrup+root-installed", "tsconfig.json");
        return T`tsc -p tsconfig.json && touch ${produces('internal:built')}`;
    });
    
    to("test", () => {
        depends("internal:built");
        return T`npm test > ${produces('test-results.txt')}`;
    });
}
export default shared;
```

```javascript
// packages/api/.zrup.mjs
/** @type {ModuleBuilder.definer} */
const api = async function api({to, depends, produces, T}) {
    
    to("build", () => {
        depends("internal:shared+built", "tsconfig.json");
        return T`tsc -p tsconfig.json && touch ${produces('internal:built')}`;
    });
    
    to("test", () => {
        depends("internal:built");
        return T`npm test > ${produces('test-results.txt')}`;
    });
    
    to("start", () => {
        always();
        depends("internal:built");
        return T`node dist/server.js`;
    });
}
export default api;
```

```javascript
// packages/web/.zrup.mjs
/** @type {ModuleBuilder.definer} */
const web = async function web({to, depends, produces, T}) {
    
    to("build", () => {
        depends("internal:shared+built");
        return {
            cmd: "npm run build",
            out: produces("internal:build-log.txt")
        };
    });
    
    to("build-marker", () => {
        depends("internal:build-log.txt");
        return T`touch ${produces('internal:built')}`;
    });
    
    to("test", () => {
        depends("internal:built");
        return T`npm test > ${produces('test-results.txt')}`;
    });
}
export default web;
```

## Example 3: C/C++ Project with Make

Integrating a traditional Makefile-based project.

```javascript
/** @type {ModuleBuilder.definer} */
const cpp = async function cpp({to, always, depends, produces, resolve, T}) {
    
    // Fingerprint source files
    to("source-fingerprint", () => {
        always();
        return T`find src include -name "*.cpp" -o -name "*.h" | sort | xargs md5sum > ${produces('internal:source-fp')}`;
    });
    
    // Configure
    to("configure", () => {
        depends("CMakeLists.txt");
        return {
            cwd: "build",
            cmd: "cmake ..",
            out: produces("internal:configure-log.txt")
        };
    });
    
    // Build
    to("build", () => {
        depends("internal:source-fp", "internal:configure-log.txt");
        return {
            cwd: "build",
            cmd: "make -j4",
            combined: produces("internal:build-log.txt")
        };
    });
    
    // Mark build complete
    to("build-marker", () => {
        depends("internal:build-log.txt");
        return T`touch ${produces('internal:built')}`;
    });
    
    // Run tests
    to("test", () => {
        depends("internal:built");
        return {
            cwd: "build",
            cmd: "ctest --output-on-failure",
            combined: produces("test-results.txt")
        };
    });
    
    // Install
    to("install", () => {
        depends("internal:built");
        return {
            cwd: "build",
            cmd: "make install",
            out: produces("internal:installed")
        };
    });
}
export default cpp;
```

## Example 4: Docker Multi-Stage Build

Building Docker images with proper dependency tracking.

```javascript
/** @type {ModuleBuilder.definer} */
const docker = async function docker({to, always, depends, produces, T}) {
    
    // Build application first
    to("build-app", () => {
        depends("internal:compiled");
        return T`npm run build && touch ${produces('internal:app-built')}`;
    });
    
    // Fingerprint Docker context
    to("docker-context-fp", () => {
        always();
        depends("Dockerfile", "internal:app-built");
        return T`find dist -type f | xargs md5sum > ${produces('internal:docker-context-fp')}`;
    });
    
    // Build base image
    to("build-base-image", () => {
        depends("Dockerfile.base");
        return T`docker build -f Dockerfile.base -t myapp:base . && echo "built" > ${produces('internal:base-image')}`;
    });
    
    // Build application image
    to("build-app-image", () => {
        depends("internal:docker-context-fp", "internal:base-image");
        return T`docker build -t myapp:latest . && echo "built" > ${produces('internal:app-image')}`;
    });
    
    // Tag for registry
    to("tag-image", () => {
        depends("internal:app-image");
        return T`docker tag myapp:latest registry.example.com/myapp:latest && echo "tagged" > ${produces('internal:tagged')}`;
    });
    
    // Push to registry
    to("push-image", () => {
        always();  // Always push
        depends("internal:tagged");
        return T`docker push registry.example.com/myapp:latest && echo "pushed" > ${produces('internal:pushed')}`;
    });
}
export default docker;
```

## Example 5: Frontend Build with Asset Processing

Webpack/Vite build with asset optimization.

```javascript
/** @type {ModuleBuilder.definer} */
const frontend = async function frontend({to, always, depends, produces, T}) {
    
    // Install dependencies
    to("install", () => {
        depends("package.json", "package-lock.json");
        return T`npm ci && touch ${produces('internal:installed')}`;
    });
    
    // Lint
    to("lint", () => {
        depends("internal:installed");
        return T`npm run lint > ${produces('lint-results.txt')}`;
    });
    
    // Fingerprint source files
    to("source-fp", () => {
        always();
        depends("internal:installed");
        return T`find src public -type f | xargs md5sum > ${produces('internal:source-fp')}`;
    });
    
    // Build development
    to("build-dev", () => {
        depends("internal:source-fp");
        return {
            cmd: "npm run build:dev",
            out: produces("internal:build-dev-log.txt")
        };
    });
    
    // Build production
    to("build-prod", () => {
        depends("internal:source-fp");
        return {
            cmd: "npm run build:prod",
            out: produces("internal:build-prod-log.txt")
        };
    });
    
    // Optimize images
    to("optimize-images", () => {
        depends("internal:build-prod-log.txt");
        return T`find dist -name "*.png" -o -name "*.jpg" | xargs optipng && touch ${produces('internal:images-optimized')}`;
    });
    
    // Mark production build complete
    to("prod-complete", () => {
        depends("internal:images-optimized");
        return T`touch ${produces('internal:prod-built')}`;
    });
}
export default frontend;
```

## Example 6: Database Migrations

Managing database schema changes.

```javascript
import {WrapperRecipe} from "./js/build/recipe/wrapper.js";
import {CommandRecipe} from "./js/build/recipe/command.js";

/** @type {ModuleBuilder.definer} */
const db = async function db({rule, to, always, depends, produces, T}) {
    
    // Fingerprint migrations
    to("migrations-fp", () => {
        always();
        return T`find migrations -name "*.sql" | sort | xargs md5sum > ${produces('internal:migrations-fp')}`;
    });
    
    // Apply migrations with logging
    rule(function applyMigrations() {
        depends("internal:migrations-fp");
        
        const migrateRecipe = new CommandRecipe(({exec, args, combined}) => {
            exec("./scripts/migrate.sh");
            combined(produces("migration-log.txt"));
        });
        
        return new WrapperRecipe({
            recipe: migrateRecipe,
            
            before: async (job) => {
                console.log("Starting database migrations...");
                // Could check DB connectivity here
            },
            
            after: async (job) => {
                console.log("Migrations completed successfully");
                // Could send notification here
            }
        });
    });
}
export default db;
```

## Example 7: Code Generation

Generating code from schemas or templates.

```javascript
/** @type {ModuleBuilder.definer} */
const codegen = async function codegen({to, depends, produces, T}) {
    
    // Generate API client from OpenAPI spec
    to("generate-api-client", () => {
        depends("api-spec.yaml");
        return T`openapi-generator-cli generate -i api-spec.yaml -g typescript-axios -o src/generated/api && touch ${produces('internal:api-client-generated')}`;
    });
    
    // Generate GraphQL types
    to("generate-graphql", () => {
        depends("schema.graphql");
        return T`graphql-codegen --config codegen.yml && touch ${produces('internal:graphql-generated')}`;
    });
    
    // Generate Protobuf code
    to("generate-proto", () => {
        depends("schema.proto");
        return T`protoc --js_out=import_style=commonjs:src/generated schema.proto && touch ${produces('internal:proto-generated')}`;
    });
    
    // Build after all generation
    to("build", () => {
        depends(
            "internal:api-client-generated",
            "internal:graphql-generated",
            "internal:proto-generated"
        );
        return T`tsc && touch ${produces('internal:built')}`;
    });
}
export default codegen;
```

## Example 8: Multi-Environment Deployment

Deploying to different environments with proper staging.

```javascript
/** @type {ModuleBuilder.definer} */
const deploy = async function deploy({to, after, depends, produces, T}) {
    
    // Build production bundle
    to("build-bundle", () => {
        depends("internal:compiled");
        return T`npm run build:prod && touch ${produces('internal:bundle-built')}`;
    });
    
    // Deploy to staging
    to("deploy-staging", () => {
        depends("internal:bundle-built");
        return T`./scripts/deploy.sh staging && echo "deployed" > ${produces('internal:deployed-staging')}`;
    });
    
    // Run smoke tests on staging
    to("smoke-test-staging", () => {
        depends("internal:deployed-staging");
        return T`./scripts/smoke-test.sh staging > ${produces('staging-smoke-test.txt')}`;
    });
    
    // Deploy to production
    to("deploy-production", () => {
        depends("staging-smoke-test.txt");
        return T`./scripts/deploy.sh production && echo "deployed" > ${produces('internal:deployed-production')}`;
    });
    
    // Smoke test production
    to("smoke-test-production", () => {
        depends("internal:deployed-production");
        return T`./scripts/smoke-test.sh production > ${produces('production-smoke-test.txt')}`;
    });
}
export default deploy;
```

## Example 9: Testing at Scale

Running different types of tests efficiently.

```javascript
/** @type {ModuleBuilder.definer} */
const testing = async function testing({to, also, depends, produces, T}) {
    
    // Unit tests (fast)
    to("test-unit", () => {
        depends("internal:compiled");
        return T`npm run test:unit > ${produces('unit-test-results.txt')}`;
    });
    
    // Integration tests
    to("test-integration", () => {
        depends("internal:compiled");
        return {
            cmd: "npm run test:integration",
            combined: produces("integration-test-results.txt")
        };
    });
    
    // E2E tests
    to("test-e2e", () => {
        depends("internal:compiled");
        return {
            cmd: "npm run test:e2e",
            combined: produces("e2e-test-results.txt")
        };
    });
    
    // Run all tests (with coverage)
    to("test-all", () => {
        also("test-coverage");  // Always generate coverage
        depends(
            "unit-test-results.txt",
            "integration-test-results.txt",
            "e2e-test-results.txt"
        );
        return T`echo "All tests passed" > ${produces('all-tests.txt')}`;
    });
    
    // Coverage report
    to("test-coverage", () => {
        depends("internal:compiled");
        return T`npm run test:coverage > ${produces('coverage-report.txt')}`;
    });
}
export default testing;
```

## Example 10: Documentation Generation

Building documentation from multiple sources.

```javascript
/** @type {ModuleBuilder.definer} */
const docs = async function docs({to, depends, produces, resolve, T}) {
    
    // Generate API docs from code
    to("api-docs", () => {
        depends("internal:compiled");
        return T`npx typedoc --out docs/api src && touch ${produces('internal:api-docs-built')}`;
    });
    
    // Build user documentation from markdown
    to("user-docs", () => {
        depends("internal:api-docs-built");
        return {
            cwd: "docs",
            cmd: "mkdocs build",
            out: produces("internal:user-docs-log.txt")
        };
    });
    
    // Generate PDF documentation
    to("pdf-docs", () => {
        depends("internal:user-docs-log.txt");
        return T`pandoc docs/user-guide.md -o ${produces('docs/user-guide.pdf')}`;
    });
    
    // Aggregate all documentation
    to("all-docs", () => {
        depends("internal:api-docs-built", "internal:user-docs-log.txt", "docs/user-guide.pdf");
        return T`echo "All documentation built" > ${produces('internal:all-docs')}`;
    });
}
export default docs;
```

## Summary

These examples demonstrate:
- Real-world project structures
- Dependency management patterns
- Integration with external tools
- Multi-stage builds
- Environment-specific deployments
- Testing strategies
- Code generation workflows
- Documentation builds

Use these as templates for your own projects, adapting them to your specific needs.
