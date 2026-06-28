# @fluixi/cli

## 0.1.0-alpha.25

### Patch Changes

- Updated dependencies [bec9d21]
- Updated dependencies [6f8a9d4]
  - @fluixi/start@0.1.0-alpha.24

## 0.1.0-alpha.24

### Patch Changes

- @fluixi/start@0.1.0-alpha.23

## 0.1.0-alpha.23

### Patch Changes

- Updated dependencies [d7a38ba]
- Updated dependencies [d7a38ba]
- Updated dependencies [d7a38ba]
  - @fluixi/start@0.1.0-alpha.22

## 0.1.0-alpha.22

### Patch Changes

- @fluixi/start@0.1.0-alpha.21

## 0.1.0-alpha.21

### Patch Changes

- Updated dependencies [8cb37e5]
- Updated dependencies [2822fc8]
  - @fluixi/start@0.1.0-alpha.20

## 0.1.0-alpha.20

### Patch Changes

- Updated dependencies [efcf341]
  - @fluixi/start@0.1.0-alpha.19

## 0.1.0-alpha.19

### Patch Changes

- Updated dependencies [663f0b4]
  - @fluixi/start@0.1.0-alpha.18

## 0.1.0-alpha.18

### Patch Changes

- @fluixi/start@0.1.0-alpha.17

## 0.1.0-alpha.17

### Minor Changes

- 7616a36: Less auth boilerplate + proper cookies + a CLI generator.

  - **`createAuthHooks({ session })`** — drive the hooks from an existing reactive session
    (e.g. `@fluixi/session`) instead of a Better Auth client. The framework owns the reactive
    sync, so apps stop hand-writing a `createEffect` to mirror their store into the auth hooks
    (`useUser`/`protectedRoute`/`useSignIn` derive from `session.user`/`login`/`logout`).
  - **Cookie API** (from `@fluixi/auth/server`) — `parseCookies`, `serializeCookie`
    (secure-by-default: HttpOnly, Secure, SameSite=Lax, Path=/), `deleteCookie`, and
    request-scoped `getCookie`/`getCookies`.
  - **`fluixi generate auth`** — scaffolds `auth.config.ts`, `auth.client.ts`, `src/middleware.ts`,
    and the `/api/auth/[...all]` route in one command.

### Patch Changes

- @fluixi/start@0.1.0-alpha.16

## 0.1.0-alpha.16

### Patch Changes

- Updated dependencies [042d86a]
  - @fluixi/start@0.1.0-alpha.15

## 0.1.0-alpha.15

### Patch Changes

- @fluixi/start@0.1.0-alpha.14

## 0.1.0-alpha.14

### Patch Changes

- @fluixi/start@0.1.0-alpha.13

## 0.1.0-alpha.13

### Patch Changes

- @fluixi/start@0.1.0-alpha.12

## 0.1.0-alpha.12

### Patch Changes

- @fluixi/start@0.1.0-alpha.11

## 0.1.0-alpha.11

### Patch Changes

- @fluixi/start@0.1.0-alpha.10

## 0.1.0-alpha.10

### Patch Changes

- @fluixi/start@0.1.0-alpha.9

## 0.1.0-alpha.9

### Patch Changes

- @fluixi/start@0.1.0-alpha.8

## 0.1.0-next.8

### Minor Changes

- fdfa579: Redesigned CLI experience. A gradient `fluixi` wordmark and a clean, colored layout
  across the toolchain (zero new dependencies — hand-rolled ANSI that degrades to plain
  text when not a TTY / under `NO_COLOR`):

  - **`fluixi dev`** now prints a proper "ready" panel — timing plus `Local` and `Network`
    URLs — instead of a single `localhost:PORT` line.
  - **`fluixi build`** shows a wordmark header, per-step lines, and a timed `built` summary.
  - **`fluixi --help`** / `generate` use the wordmark, colored commands, and ✓/✗ markers.
  - **`npm create @fluixi`** gets a modern interactive flow: gradient intro, gutter prompts,
    and an arrow-key App-mode selector (SSR/SPA), with a styled "Next steps" outro.
  - New `@fluixi/start/ui` export (shared color/wordmark/panel helpers) honoring
    `NO_COLOR`/`FORCE_COLOR`.

### Patch Changes

- Updated dependencies [fdfa579]
  - @fluixi/start@0.1.0-next.7

## 0.1.0-next.7

### Patch Changes

- eb95b6c: Docs: rewrite the package READMEs in the canonical format (logo, badges, overview,
  install, usage, license) and bring them up to date — streaming SSR, middleware, server
  functions, `fluixi generate`, and the SSR/SPA scaffold. Adds the missing `@fluixi/create`
  README. (The root README's package list + architecture were also corrected.)
- Updated dependencies [eb95b6c]
- Updated dependencies [43a36e2]
- Updated dependencies [f30d5e9]
- Updated dependencies [3932e9d]
  - @fluixi/start@0.1.0-next.6

## 0.1.0-next.6

### Patch Changes

- Updated dependencies [53ba1b0]
  - @fluixi/start@0.1.0-next.5

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
