# @fluixi/cli

## 0.1.0-next.5

### Minor Changes

- 6354c48: Add `fluixi generate <kind> <name>` (alias `g`): scaffold a `component` (→
  `src/components/<Name>.tsx`), a file-based `route` (→ `src/routes/<path>.tsx`, dynamic
  segments like `blog/[id]` supported), or `middleware` (→ `src/middleware.ts`) into the
  current app.

## 0.1.0-next.4

### Patch Changes

- @fluixi/start@0.1.0-next.4

## 0.1.0-next.3

### Patch Changes

- Updated dependencies [ccf61af]
  - @fluixi/start@0.1.0-next.3

## 0.1.0-next.2

### Patch Changes

- Updated dependencies [7d38a50]
- Updated dependencies [eb302cb]
- Updated dependencies [992c196]
  - @fluixi/start@0.1.0-next.2

## 0.1.0-next.1

### Patch Changes

- Updated dependencies [13d41ee]
  - @fluixi/start@0.1.0-next.1

## 0.1.0-next.0

### Minor Changes

- 1a15bce: Add the Fluixi meta-framework (walking skeleton). `@fluixi/start` is the runtime that sits on top of `@fluixi/kettlejs`: `dev` (Vite-middleware SSR dev server with shared-HMR + crash guards), `build` (client + server bundles), and `start` (production SSR server). All rendering flows through a runtime-neutral Web `Request → Response` handler (`createRequestHandler`), with Node as a thin bridge (`toNodeHandler`/`nodeToRequest`/`sendResponse`) — the seam future edge/worker/Bun/Deno adapters plug into. It injects the kettlejs build plugins (file routing + JSX/SSR transform) for zero-config setup, and exposes `defineConfig`/`loadConfig` + conventions (src/entry-server.ts, index.html with `<div id="root">`). `@fluixi/cli` is the `fluixi` command-line tool (`fluixi dev|build|start`) that delegates to it.

### Patch Changes

- Updated dependencies [1a15bce]
  - @fluixi/start@0.1.0-next.0
