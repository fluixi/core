# @fluixi/cli

## 1.0.0-alpha.103

### Patch Changes

- @fluixi/start@1.0.0-alpha.103
- @fluixi/ts-plugin@1.0.0-alpha.103

## 1.0.0-alpha.102

### Patch Changes

- c2d1fea: `fluixi dev` and `fluixi start` take the port from `--port=<n>` or `--port <n>`, then the `PORT` variable, then `port` in `fluixi.config.ts`, then 3000. An invalid value stops with an error naming the flag or variable.
  - @fluixi/start@1.0.0-alpha.102
  - @fluixi/ts-plugin@1.0.0-alpha.102

## 1.0.0-alpha.101

### Patch Changes

- @fluixi/start@1.0.0-alpha.101
- @fluixi/ts-plugin@1.0.0-alpha.101

## 1.0.0-alpha.100

### Patch Changes

- 94153dc: `@fluixi/oauth2` installs `@fluixi/auth` and `@fluixi/session` directly, so applications using `@fluixi/oauth2` may remove `@fluixi/auth` from their dependencies if it's only used for OAuth2. Its peers include `@fluixi/dom` and `@fluixi/storage`, and Fluixi packages depend on each other through `^` ranges.
- Updated dependencies [94153dc]
- Updated dependencies [9d88d84]
  - @fluixi/start@1.0.0-alpha.100
  - @fluixi/ts-plugin@1.0.0-alpha.100

## 1.0.0-alpha.99

### Patch Changes

- Updated dependencies [3ed276b]
- Updated dependencies [4ec5021]
  - @fluixi/start@1.0.0-alpha.99
  - @fluixi/ts-plugin@1.0.0-alpha.99

## 0.1.0-alpha.89

### Patch Changes

- Updated dependencies [86e38e1]
  - @fluixi/start@0.1.0-alpha.88
  - @fluixi/ts-plugin@0.1.0-alpha.32

## 0.1.0-alpha.88

### Patch Changes

- @fluixi/start@0.1.0-alpha.87
- @fluixi/ts-plugin@0.1.0-alpha.31

## 0.1.0-alpha.87

### Patch Changes

- @fluixi/start@0.1.0-alpha.86
- @fluixi/ts-plugin@0.1.0-alpha.30

## 0.1.0-alpha.86

### Minor Changes

- 06a5af9: The compiler now sets JSX through oxc when Vite bundles with Rolldown and through esbuild otherwise, start now builds single-file bundles with the option each bundler expects, the env check now includes the file name in its error under Vite 8, and fluixi check and fluixi doctor now work in a TypeScript 7 app by falling back to the CLI's classic TypeScript.

### Patch Changes

- Updated dependencies [e4cf090]
- Updated dependencies [06a5af9]
  - @fluixi/start@0.1.0-alpha.85
  - @fluixi/ts-plugin@0.1.0-alpha.29

## 0.1.0-alpha.85

### Patch Changes

- @fluixi/start@0.1.0-alpha.84
- @fluixi/ts-plugin@0.1.0-alpha.28

## 0.1.0-alpha.84

### Patch Changes

- Updated dependencies [2fb0e05]
- Updated dependencies [722d8c8]
- Updated dependencies [407217b]
- Updated dependencies [e77734a]
- Updated dependencies [f2f2447]
- Updated dependencies [55a57dd]
- Updated dependencies [9a05eb9]
- Updated dependencies [b3ea476]
- Updated dependencies [bf0907f]
- Updated dependencies [de25d02]
- Updated dependencies [cd49ddc]
- Updated dependencies [948b2be]
- Updated dependencies [92fe73b]
- Updated dependencies [9295123]
- Updated dependencies [b2e1ff3]
- Updated dependencies [ceb7864]
  - @fluixi/start@0.1.0-alpha.83
  - @fluixi/ts-plugin@0.1.0-alpha.27

## 0.1.0-alpha.83

### Minor Changes

- 9ebcd7b: fluixi add auth now asks for a provider and token mode, writes the wiring, and installs the package (use `--no-install` to skip); `@fluixi/cli/scaffold` exposes the generators' code with no dependencies and a `fluixi.config` without an env block receives one.
- 7864fb6: - `fluixi check` now validates editor env/auth rules in CI and exits with code 1 on error, with `--strict` treating warnings as errors.
  - `fluixi env` reports which `env.public` names are set, detects .env.example drift, warns about secrets that would ship, and writes environment types.
  - `fluixi doctor` now reports when the same @fluixi package is installed twice, when ts-plugin is missing from tsconfig, and other environment problems.
  - `fluixi info` now displays versions, adapter, modules, pages, and API routes.
- b6a7a54: - The `g env` generator now picks environment variables from `env.public` using `pickEnv`.
  - The `g module` generator now registers modules in `src/app.config.ts` (or `.server.ts`) and creates the file if it does not exist.
  - The `g service` generator now creates a class, a token, and a module.
  - The `g api --role` generator now creates a route guarded by `createApiGuard`.
  - The `g server-fn` generator now creates a server function file.
  - The `g auth oauth2` generator now sets up environment configuration, a service, callback and login routes, a server module, and required environment variables.
  - The auth better-auth route now resides in `src/api/auth` instead of `src/routes/api/auth`.

### Patch Changes

- Updated dependencies [7864fb6]
- Updated dependencies [9eb3e98]
- Updated dependencies [7a516d3]
- Updated dependencies [82c72c0]
- Updated dependencies [f4dc50c]
- Updated dependencies [7864fb6]
- Updated dependencies [39a3db5]
  - @fluixi/start@0.1.0-alpha.82
  - @fluixi/ts-plugin@0.1.0-alpha.26

## 0.1.0-alpha.82

### Patch Changes

- Updated dependencies [6e98608]
  - @fluixi/start@0.1.0-alpha.81

## 0.1.0-alpha.81

### Patch Changes

- Updated dependencies [9d334dc]
  - @fluixi/start@0.1.0-alpha.80

## 0.1.0-alpha.80

### Patch Changes

- Updated dependencies [4ada5ee]
  - @fluixi/start@0.1.0-alpha.79

## 0.1.0-alpha.79

### Patch Changes

- Updated dependencies [d5ebde7]
  - @fluixi/start@0.1.0-alpha.78

## 0.1.0-alpha.78

### Minor Changes

- d6c8562: `fluixi build --format=web-component` emits each component named in a `webComponents` config block as a self-contained file: a page loads it with a `<script type="module">` and needs no Fluixi package installed. `--format=fluixi` emits the same elements with the runtime left as imports, so an app running several of them shares one copy. An app that declares `webComponents` also gets the files beside its own bundles on a normal build.

### Patch Changes

- 9fc671c: The CLI now warns when it runs a different `@fluixi/start` than the one the app resolves.
- Updated dependencies [54b8466]
- Updated dependencies [655c5d2]
- Updated dependencies [79bd79f]
- Updated dependencies [7bc3e64]
- Updated dependencies [5a7e92a]
- Updated dependencies [f388d49]
- Updated dependencies [337a424]
- Updated dependencies [18d3696]
- Updated dependencies [a6cac6f]
- Updated dependencies [6f26bee]
- Updated dependencies [52388aa]
- Updated dependencies [29a639b]
- Updated dependencies [29a639b]
- Updated dependencies [d7d4089]
- Updated dependencies [d6c8562]
  - @fluixi/start@0.1.0-alpha.77

## 0.1.0-alpha.77

### Patch Changes

- Updated dependencies [128f233]
  - @fluixi/start@0.1.0-alpha.76

## 0.1.0-alpha.76

### Patch Changes

- 5062033: The `@fluixi/start` root export now is safe to import from a browser bundle. Import `loadConfig`, `serveNode`, adapters, or `createImageHandler` from their subpaths instead of the package root.
- Updated dependencies [a2f0eb8]
- Updated dependencies [5062033]
  - @fluixi/start@0.1.0-alpha.75

## 0.1.0-alpha.75

### Patch Changes

- aa17d01: `@fluixi/cli`, `@fluixi/devtools`, `@fluixi/head`, `@fluixi/router`, `@fluixi/server`, and `@fluixi/start` now provide bundled builds with import resolving to a `.mjs` file and a require condition resolving to a `.cjs` file, and `@fluixi/core` and `@fluixi/compiler` now include the copyright banner in their subpath exports.
- Updated dependencies [aa17d01]
  - @fluixi/start@0.1.0-alpha.74

## 0.1.0-alpha.74

### Patch Changes

- Updated dependencies [f1d153c]
  - @fluixi/start@0.1.0-alpha.73

## 0.1.0-alpha.73

### Patch Changes

- @fluixi/start@0.1.0-alpha.72

## 0.1.0-alpha.72

### Patch Changes

- @fluixi/start@0.1.0-alpha.71

## 0.1.0-alpha.71

### Patch Changes

- Updated dependencies [4a30116]
  - @fluixi/start@0.1.0-alpha.70

## 0.1.0-alpha.70

### Patch Changes

- Updated dependencies [21a13fd]
  - @fluixi/start@0.1.0-alpha.69

## 0.1.0-alpha.69

### Patch Changes

- @fluixi/start@0.1.0-alpha.68

## 0.1.0-alpha.68

### Minor Changes

- e837607: Let an SSR app configure component resolution, and stop making people hand-write it.

  `fluixi.config.ts` had no seam for it — `createVitePlugin()` was called with no options
  — so an SSR app couldn't say where an unimported tag comes from at all. `resolve` is a
  config field now and reaches the compiler.

  The scaffolded apps carry one pattern rule covering `src/components`, so a generated
  component works as a tag with no config edit, ever:

  ```ts
  resolve: [{ match: /^([A-Z]\w+)$/, module: '/src/components/$1.tsx' }];
  ```

  `fluixi g component` prints that line when a project has no rule yet, and stays quiet
  when it does. It reads the config and never writes it: a config is arbitrary
  TypeScript, and editing it means reprinting someone's file.

### Patch Changes

- Updated dependencies [e837607]
  - @fluixi/start@0.1.0-alpha.67

## 0.1.0-alpha.67

### Patch Changes

- Updated dependencies [8f77029]
  - @fluixi/start@0.1.0-alpha.66

## 0.1.0-alpha.66

### Patch Changes

- Updated dependencies [7547cd4]
- Updated dependencies [720c617]
  - @fluixi/start@0.1.0-alpha.65

## 0.1.0-alpha.65

### Patch Changes

- 10b4b6f: Deploy adapters for Cloudflare, Netlify and Vercel.

  An adapter can now emit the layout its platform reads, through a `build` hook that
  runs after the client build, the server build and prerendering:

  |                     | writes                                          | deploy                   |
  | ------------------- | ----------------------------------------------- | ------------------------ |
  | `cloudflareAdapter` | `dist/client/_worker.js` + `_routes.json`       | publish `dist/client`    |
  | `netlifyAdapter`    | `.netlify/functions-internal/fluixi-server.mjs` | publish `dist/client`    |
  | `vercelAdapter`     | `.vercel/output/` (Build Output API v3)         | Vercel reads it directly |

  Each serves static files first and only reaches the server on a miss — Cloudflare
  through the `ASSETS` binding, Netlify through `preferStatic`, Vercel through a
  `filesystem` route ahead of the function — so a prerendered page stays a file.

  **`createHandlerFrom` splits the handler from the filesystem.** `createProdHandler`
  reads `index.html` off disk and imports the server entry by path; a worker can do
  neither. The assembly now takes the template and the module as arguments, and each
  adapter generates an entry that imports both statically. One assembly, so an edge
  deploy cannot dispatch differently from `fluixi start`.

  **The entry is bundled as a single file.** On Cloudflare that is not a size choice:
  `_worker.js` is written into the directory you publish, so a split chunk would be a
  publicly downloadable piece of your server. Verified — the published assets are now
  identical to a plain build.

  **The CLI commands move to `@fluixi/start/commands`.** They were re-exported from the
  package root, so `import { defineMiddleware } from '@fluixi/start'` could reach the dev
  server — and an adapter, which inlines everything its entry can reach, carried vite into
  the worker bundle. `@fluixi/cli` imports them from the new subpath.

- Updated dependencies [8838294]
- Updated dependencies [93421e8]
- Updated dependencies [6a41eb8]
- Updated dependencies [93421e8]
- Updated dependencies [8b37811]
- Updated dependencies [08635bd]
- Updated dependencies [10b4b6f]
- Updated dependencies [059b38b]
- Updated dependencies [f2cf2bb]
  - @fluixi/start@0.1.0-alpha.64

## 0.1.0-alpha.64

### Patch Changes

- @fluixi/start@0.1.0-alpha.63

## 0.1.0-alpha.63

### Patch Changes

- @fluixi/start@0.1.0-alpha.62

## 0.1.0-alpha.62

### Patch Changes

- @fluixi/start@0.1.0-alpha.61

## 0.1.0-alpha.61

### Patch Changes

- @fluixi/start@0.1.0-alpha.60

## 0.1.0-alpha.60

### Patch Changes

- @fluixi/start@0.1.0-alpha.59

## 0.1.0-alpha.59

### Patch Changes

- @fluixi/start@0.1.0-alpha.58

## 0.1.0-alpha.58

### Patch Changes

- @fluixi/start@0.1.0-alpha.57

## 0.1.0-alpha.57

### Patch Changes

- @fluixi/start@0.1.0-alpha.56

## 0.1.0-alpha.56

### Patch Changes

- @fluixi/start@0.1.0-alpha.55

## 0.1.0-alpha.55

### Patch Changes

- @fluixi/start@0.1.0-alpha.54

## 0.1.0-alpha.54

### Patch Changes

- @fluixi/start@0.1.0-alpha.53

## 0.1.0-alpha.53

### Patch Changes

- @fluixi/start@0.1.0-alpha.52

## 0.1.0-alpha.52

### Patch Changes

- @fluixi/start@0.1.0-alpha.51

## 0.1.0-alpha.51

### Patch Changes

- @fluixi/start@0.1.0-alpha.50

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
