# Prevntiv Monorepo Dependency Resolution Strategy

This repository uses `pnpm` workspaces with a single lockfile at the root.

## How dependencies are resolved

1. Single lockfile: `pnpm-lock.yaml` at the root guarantees deterministic installs across all apps, services, and packages.
2. Content-addressable store: pnpm stores package contents once and links them into each workspace package, reducing duplication and install time.
3. Workspace linking: internal packages are referenced using workspace names (for example, `@prevntiv/shared-types`) and linked locally instead of downloading from npm.
4. Strict boundaries: each workspace keeps its own `package.json`, so runtime dependencies stay explicit and isolated.
5. Shared TypeScript config: each TypeScript workspace extends root `tsconfig.json` for consistent compiler behavior and aliasing.

## Import strategy for internal packages

Use package names rather than relative deep paths:

- `@prevntiv/shared-types`
- `@prevntiv/validators`
- `@prevntiv/ui-components`

This keeps imports stable as the codebase grows.

## Install and run model

- Install once at root: `pnpm install`
- Run tasks recursively from root via `pnpm -r` scripts
- Build order can later be optimized with dependency-aware tools (for example Turbo), but current setup is clean and production-safe for incremental prompt execution
