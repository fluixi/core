# @fluixi/cli

## 0.1.0-alpha.50

### Patch Changes

- Updated dependencies [725322e]
  - @fluixi/start@0.1.0-alpha.49

## 0.1.0-alpha.49

### Patch Changes

- @fluixi/start@0.1.0-alpha.48

## 0.1.0-alpha.48

### Patch Changes

- @fluixi/start@0.1.0-alpha.47

## 0.1.0-alpha.47

### Minor Changes

- 537a0b9: `fluixi generate` emits html`` components/routes (plain `.ts`) when the project is
html``-authored — detected from the tsconfig (no `jsx`), or forced with `--html` / `--jsx`.
  JSX projects still generate `.tsx` as before.

### Patch Changes

- Updated dependencies [d9a5cc4]
  - @fluixi/start@0.1.0-alpha.46

## 0.1.0-alpha.46

### Patch Changes

- daa7af2: Update READMEs for public npm: drop the GitHub Packages `.npmrc` install instructions (no auth needed on public npm) and replace the GitHub Packages registry badge with an npm version badge.
- Updated dependencies [daa7af2]
  - @fluixi/start@0.1.0-alpha.45

## 0.1.0-alpha.45

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/start@0.1.0-alpha.44

## 0.1.0-alpha.44

### Patch Changes

- @fluixi/start@0.1.0-alpha.43

## 0.1.0-alpha.43

### Patch Changes

- @fluixi/start@0.1.0-alpha.42

## 0.1.0-alpha.42

### Patch Changes

- @fluixi/start@0.1.0-alpha.41

## 0.1.0-alpha.41

### Patch Changes

- Updated dependencies [f93989f]
  - @fluixi/start@0.1.0-alpha.40

## 0.1.0-alpha.40

### Patch Changes

- @fluixi/start@0.1.0-alpha.39

## 0.1.0-alpha.39

### Patch Changes

- @fluixi/start@0.1.0-alpha.38

## 0.1.0-alpha.38

### Patch Changes

- @fluixi/start@0.1.0-alpha.37

## 0.1.0-alpha.37

### Patch Changes

- @fluixi/start@0.1.0-alpha.36

## 0.1.0-alpha.36

### Patch Changes

- @fluixi/start@0.1.0-alpha.35

## 0.1.0-alpha.35

### Patch Changes

- @fluixi/start@0.1.0-alpha.34

## 0.1.0-alpha.34

### Patch Changes

- @fluixi/start@0.1.0-alpha.33

## 0.1.0-alpha.33

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
- Updated dependencies [3f0e665]
  - @fluixi/start@0.1.0-alpha.32

## 0.1.0-alpha.32

### Patch Changes

- @fluixi/start@0.1.0-alpha.31

## 0.1.0-alpha.31

### Patch Changes

- @fluixi/start@0.1.0-alpha.30

## 0.1.0-alpha.30

### Patch Changes

- @fluixi/start@0.1.0-alpha.29

## 0.1.0-alpha.29

### Patch Changes

- @fluixi/start@0.1.0-alpha.28

## 0.1.0-alpha.28

### Patch Changes

- fd5a896: Solid-compatible prop helpers + component typing, and re-export them from `@fluixi/core`.

  **`mergeProps` (dom):** a later source's `undefined` no longer clobbers an earlier defined value — it falls through to it (Solid's contract). Previously `mergeProps(defaults, props)` lost `defaults` whenever `props.x` was `undefined`, and since the compiler emits `mergeProps(...spreads, baseProps)` for JSX spreads, `<div {...a} {...b} />` with `b.x === undefined` wiped `a.x`. It's now a lazy Proxy (like `splitProps`): keys resolve last-defined-wins across the union of sources, reactively (getter/signal-backed props re-read on every access, never snapshotted).

  ```ts
  mergeProps({ value: 1 }, { value: undefined }).value; // 1 (was undefined)
  mergeProps({ value: 1 }, { value: 2 }).value; // 2
  ```

  **`Component` typing (dom):** `Component<P>` is now a proper function type — `(props: P) => …` — so you can annotate it and have `props` actually typed:

  ```ts
  const Greeting: Component<{ name: string }> = (props) => (
    <h1>{props.name}</h1>
  );
  ```

  Previously `Component<P>` was `ComponentFn<P> | ComponentChild` (which includes `any`), erasing all prop checking. Fluixi-branded helper types: `FxComponent`/`FxC` (aliases of `Component`), `FxParent`/`FxParentProps` (optional children), `FxVoid`/`FxVoidProps` (no children), `FxFlow`/`FxFlowProps` (required children), and `ComponentOrElement` for the loose "function-or-rendered-node" shape some internals pass around.

  **`@fluixi/core` re-exports:** `mergeProps`, `splitProps`, and the component/prop types (`Component`, `ComponentProps`, `ComponentFn`, `ComponentChild`, `ComponentOrElement`, `FxComponent`, `FxC`, `Fx{Parent,Void,Flow}` + their `*Props`) are now exported from `@fluixi/core` — no more reaching into `@fluixi/dom` for them.

  **`@fluixi/cli`:** `fluixi generate component <Name>` now scaffolds a typed component — a `<Name>Props` type and a `Component<<Name>Props>` annotation (was an untyped `export function`).

  - @fluixi/start@0.1.0-alpha.27

## 0.1.0-alpha.27

### Patch Changes

- @fluixi/start@0.1.0-alpha.26

## 0.1.0-alpha.26

### Patch Changes

- Updated dependencies [bdcc4a5]
  - @fluixi/start@0.1.0-alpha.25

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
