# @fluixi/start

## 0.1.0-alpha.74

### Patch Changes

- aa17d01: `@fluixi/cli`, `@fluixi/devtools`, `@fluixi/head`, `@fluixi/router`, `@fluixi/server`, and `@fluixi/start` now provide bundled builds with import resolving to a `.mjs` file and a require condition resolving to a `.cjs` file, and `@fluixi/core` and `@fluixi/compiler` now include the copyright banner in their subpath exports.
- Updated dependencies [9565405]
- Updated dependencies [aa17d01]
- Updated dependencies [bef4cb6]
- Updated dependencies [e077a97]
- Updated dependencies [c3d5026]
  - @fluixi/dom@1.0.0-alpha.84
  - @fluixi/core@1.0.0-alpha.84
  - @fluixi/compiler@1.0.0-alpha.84
  - @fluixi/vite-plugin@1.0.0-alpha.84
  - @fluixi/head@1.0.0-alpha.51
  - @fluixi/server@1.0.0-alpha.84

## 0.1.0-alpha.73

### Patch Changes

- f1d153c: `fluixiPlugins` now composes `fluixi()` instead of `createVitePlugin()` to correctly set up the reactive graph, source marks, and /\_\_fluixi/graph endpoint. `createVitePlugin` is the bare compiler integration and the graph is composed on top of it by `fluixi()`, so no `@fluixi/start` app had one. Nothing to change in an application.
- Updated dependencies [e005759]
- Updated dependencies [f1d153c]
- Updated dependencies [e005759]
- Updated dependencies [f5b4031]
- Updated dependencies [e005759]
- Updated dependencies [f5b4031]
- Updated dependencies [e005759]
- Updated dependencies [f1d153c]
- Updated dependencies [ae9784f]
- Updated dependencies [f5b4031]
- Updated dependencies [5f6a72f]
- Updated dependencies [f1d153c]
  - @fluixi/compiler@1.0.0-alpha.83
  - @fluixi/core@1.0.0-alpha.83
  - @fluixi/vite-plugin@1.0.0-alpha.83
  - @fluixi/dom@1.0.0-alpha.83
  - @fluixi/head@1.0.0-alpha.50
  - @fluixi/server@1.0.0-alpha.83

## 0.1.0-alpha.72

### Patch Changes

- Updated dependencies [2d8ea95]
  - @fluixi/core@1.0.0-alpha.82
  - @fluixi/dom@1.0.0-alpha.82
  - @fluixi/compiler@1.0.0-alpha.82
  - @fluixi/vite-plugin@1.0.0-alpha.82
  - @fluixi/head@1.0.0-alpha.49
  - @fluixi/server@1.0.0-alpha.82

## 0.1.0-alpha.71

### Patch Changes

- Updated dependencies [231a169]
  - @fluixi/compiler@1.0.0-alpha.81
  - @fluixi/core@1.0.0-alpha.81
  - @fluixi/vite-plugin@1.0.0-alpha.81
  - @fluixi/dom@1.0.0-alpha.81
  - @fluixi/head@1.0.0-alpha.48
  - @fluixi/server@1.0.0-alpha.81

## 0.1.0-alpha.70

### Patch Changes

- 4a30116: The package name remains `@fluixi/core`, and the router subpath is now `@fluixi/core/router` — if you previously tried using `fluixi` or `@fluixi/core/router-next`, update your imports accordingly.
- Updated dependencies [fa19974]
- Updated dependencies [4a30116]
- Updated dependencies [c698a5c]
  - @fluixi/dom@1.0.0-alpha.80
  - @fluixi/core@1.0.0-alpha.80
  - @fluixi/compiler@1.0.0-alpha.80
  - @fluixi/server@1.0.0-alpha.80
  - @fluixi/vite-plugin@1.0.0-alpha.80
  - @fluixi/head@1.0.0-alpha.47

## 0.1.0-alpha.69

### Minor Changes

- 21a13fd: The package is now named `fluixi` instead of `@fluixi/core`, with the same contents and subpaths; all other `@fluixi/*` packages retain their names.
  Replace `@fluixi/core` with `fluixi` in `package.json` and all import statements, and update subpaths like `@fluixi/core/server` to `fluixi/server`.

### Patch Changes

- Updated dependencies [21a13fd]
- Updated dependencies [21a13fd]
- Updated dependencies [21a13fd]
  - fluixi@1.0.0-alpha.79
  - @fluixi/compiler@1.0.0-alpha.79
  - @fluixi/vite-plugin@1.0.0-alpha.79
  - @fluixi/dom@1.0.0-alpha.79
  - @fluixi/head@1.0.0-alpha.46
  - @fluixi/server@1.0.0-alpha.79

## 0.1.0-alpha.68

### Patch Changes

- Updated dependencies [f121072]
  - @fluixi/core@1.0.0-alpha.78
  - @fluixi/compiler@1.0.0-alpha.78
  - @fluixi/dom@1.0.0-alpha.78
  - @fluixi/head@1.0.0-alpha.45
  - @fluixi/server@1.0.0-alpha.78
  - @fluixi/vite-plugin@1.0.0-alpha.78

## 0.1.0-alpha.67

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

- Updated dependencies [d93fdf3]
- Updated dependencies [017317d]
- Updated dependencies [daa47d7]
- Updated dependencies [56bb9b9]
- Updated dependencies [5691dc5]
  - @fluixi/compiler@1.0.0-alpha.77
  - @fluixi/dom@1.0.0-alpha.77
  - @fluixi/core@1.0.0-alpha.77
  - @fluixi/vite-plugin@1.0.0-alpha.77
  - @fluixi/server@1.0.0-alpha.77
  - @fluixi/head@1.0.0-alpha.44

## 0.1.0-alpha.66

### Patch Changes

- 8f77029: Link the SSR-rendered CSS in dev, so a page stops flashing unstyled.

  The dev server sent a fully rendered page with no stylesheets at all — the styles
  arrived with the client bundle, so every load painted unstyled first. The build had
  no such gap, which is why this only ever showed up in the environment you look at
  most.

  It now walks the SSR module graph from the server entry, collects the styles the
  render pulled in, and links them with `?direct` (dev serves a `.css` URL as a JS
  module otherwise).

- Updated dependencies [051fdeb]
- Updated dependencies [122e8f5]
- Updated dependencies [2fc0df5]
- Updated dependencies [3b7c1c7]
  - @fluixi/compiler@1.0.0-alpha.76
  - @fluixi/core@1.0.0-alpha.76
  - @fluixi/vite-plugin@1.0.0-alpha.76
  - @fluixi/dom@1.0.0-alpha.76
  - @fluixi/head@1.0.0-alpha.43
  - @fluixi/server@1.0.0-alpha.76

## 0.1.0-alpha.65

### Patch Changes

- 7547cd4: Reference a route's own chunk and stylesheet in the document that renders it.

  A lazily-imported route is its own chunk with its own CSS, and neither was mentioned
  anywhere in the shell. The browser learned they existed only once hydration ran the
  dynamic import, so the route's markup painted before its styles arrived and the chunk
  was fetched a round trip later than it could have been.

  `fluixi build` now resolves each route to the files it compiles into — that is what
  Vite's SSR manifest was being generated for, and nothing had ever read it — and writes
  a URL-pattern map to `dist/server`. The handler looks the path up and emits
  `modulepreload` and `stylesheet` links into the head; deploy adapters inline the same
  map, since a worker cannot read it. The manifest itself is no longer published: it maps
  every source path to its chunk, which is not something a CDN needs to serve.

  Every part of it is optional. An app with no file routes, a path that matches nothing,
  or a build from before this existed yields no links and an unchanged page.

  `@fluixi/core/plugins` exports `scanRoutes`, so the build resolves routes with the same
  scanner the plugin uses instead of a second copy of the conventions.

- 720c617: Serve the shell for a client route on a SPA deploy.

  An app with no server entry got the static output alone, and a cold request for a
  route it handles in the browser found no file: 404 on Vercel, where the config listed
  only the filesystem phase, and on Netlify, which serves no fallback of its own. Both
  now hand back `index.html` for an unmatched path. Cloudflare Pages already does this
  for a project with no `_worker.js`, so its adapter still writes nothing.

- Updated dependencies [087a8d3]
- Updated dependencies [7547cd4]
  - @fluixi/core@1.0.0-alpha.75
  - @fluixi/compiler@1.0.0-alpha.75
  - @fluixi/dom@1.0.0-alpha.75
  - @fluixi/head@1.0.0-alpha.42
  - @fluixi/server@1.0.0-alpha.75
  - @fluixi/vite-plugin@1.0.0-alpha.75

## 0.1.0-alpha.64

### Minor Changes

- 8838294: Adapters now decide how the server is bundled, not just how it is served.

  `dist/server` was always one self-contained file: every `@fluixi/*` package was
  copied into it. That is right for edge and serverless, where there is nothing to
  resolve against at runtime, and wasteful for a Node server, which runs from the
  app directory with the dependencies already installed next to it.

  `Adapter` gains a `bundle` mode — `'external'` on `nodeAdapter`, `'inline'` on
  `webAdapter` — and `fluixi build` follows the adapter named in
  `fluixi.config.ts`:

  ```ts
  import { defineConfig } from '@fluixi/start/config';
  import { nodeAdapter } from '@fluixi/start/adapter';

  export default defineConfig({ adapter: nodeAdapter });
  ```

  On `examples/start-app` that is `entry-server.js` at 4.6 KB instead of 76 KB — the
  app's own code and nothing else — and a build of 0.8 s instead of 1.9 s, for
  byte-identical HTML. `fluixi start` serves with the configured adapter too; one
  that returns `{ fetch }` has no process to run and now says so rather than
  exiting as if it had started.

  Nothing changes for an app that names no adapter — Vite's own heuristic still
  applies. `'external'` externalizes only the `@fluixi/*` packages the app itself
  declares as dependencies: under a strict `node_modules` layout an undeclared
  package is not resolvable from the app root, so externalizing a merely transitive
  one would emit an import Node cannot follow. Each package is listed with every
  subpath its `exports` map publishes, because Vite only honours an exact id in
  `ssr.external` — a bare package name leaves deep imports bundled, and
  `@fluixi/core` external next to `@fluixi/core/router-next` inlined is two routers
  with two sets of module state in one server. `ssrNoExternal` still wins.

  Adapters are also importable from `@fluixi/start/adapter`, so a config file can
  name one without pulling in the CLI commands.

- 08635bd: The compiler no longer runs inside babel.

  `fluixi()` and `serverFunctionsVitePlugin()` compile by rewriting the source
  directly: parse once, splice the emitted code over the spans it replaces. Nothing
  is reprinted, edits carry a source map, and types are left for esbuild to strip.
  The `native` option is gone — that is simply what the plugin does.

  Babel is kept for the case that needs it, the way Next keeps one: a
  `babel.config.js` whose other plugins have to see the output. `fluixi({ babel:
true })` selects it, and `@babel/core` and friends are optional peers, installed
  only by `@fluixi/babel-plugin-jsx`.

  What an app installs from that namespace is now `@babel/parser`, used as a
  parser. `@fluixi/vite-plugin` and `@fluixi/start` declare no babel packages at
  all, and importing `@fluixi/compiler/integrations` loads none — pinned by
  `no-babel-in-core.spec.ts`, which distinguishes a static import from the dynamic
  one behind the opt-in.

  Verified on `examples/start-app` (HTML identical to the babel build), the docs
  site (53 prerendered pages identical), the `@fluixi-ui` playground, and 681 files
  from `store-admin`, `storefront` and the component library.

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

- f2cf2bb: Import the generated server-fn and API tables from real modules

  `virtual:fluixi-server-fns` and `virtual:fluixi-api` could only be typed by an ambient
  `declare module`, which `@fluixi/start` wrote into your `src/` as `fluixi-start-env.d.ts`.

  ```diff
  - import 'virtual:fluixi-server-fns';
  + import '@fluixi/start/server-fns';

  - export { isApiRequest, handleApiRequest } from 'virtual:fluixi-api';
  + export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';
  ```

  Named `api-routes` because `@fluixi/start/api` is already the API plumbing you call
  directly. Both virtual specifiers still resolve.

  **i18n deliberately keeps its generated declaration.** `virtual:fluixi-i18n` types
  `messages` off your own JSON (`typeof import('./i18n/en.json')`) and `locales` as a literal
  tuple — that is what makes `t()` keys autocomplete, and no static package entry can express
  it. Moving it would have quietly downgraded those types to `Record<string, unknown>`.

  So `fluixi-start-env.d.ts` now contains only the i18n block, and is not written at all when
  i18n is unconfigured.

### Patch Changes

- 93421e8: Babel is no longer a dependency of `@fluixi/compiler`.

  The IR, the resolve and optimize passes, and codegen import no Babel — that has
  been true for a while, and `dist/index.mjs` proves it — but the package still
  listed five `@babel/*` packages under `dependencies`, so importing
  `@fluixi/compiler` for the component-resolver map or the IR types installed a
  whole compiler toolchain (52 MB in this workspace). `@fluixi/ts-plugin`, which
  imports `@fluixi/compiler/builtins` and nothing else, was paying that.

  `@babel/core`, `@babel/generator`, `@babel/helper-plugin-utils` and
  `@babel/preset-typescript` are now **optional peer dependencies**. The packages
  that always run a Babel compile — `@fluixi/vite-plugin`, `@fluixi/start` and
  `@fluixi/babel-plugin-jsx` — depend on them for real, so no app config changes
  and nothing new has to be installed. `@babel/types` was listed and never
  imported; it is gone.

  `no-babel-in-core.spec.ts` locks the invariant in by walking the import graph from
  each Babel-free entry point (`.` and `./builtins`), following relative imports
  transitively and catching `import 'x'`, `import … from 'x'`, `import('x')` and
  `require('x')`. A stray Babel import in the core is not a style question: for a
  consumer that never installed the optional peer, it is a module that fails to
  resolve.

- 6a41eb8: Keep prerendered pages off the Cloudflare worker.

  In advanced mode the worker sees every request that `_routes.json` does not exclude,
  so a prerendered page woke it just to hand the file back through the `ASSETS`
  binding. On a plan metered by request that spends the page-view budget on static
  files. Every prerendered path is now excluded by name, capped at Cloudflare's
  100-rule limit — past which the remainder still works, it just costs an invocation,
  and the build says so.

  `/` stays included: it is the shell an SSR miss falls back to.

- 93421e8: `@fluixi/core` no longer installs the build toolchain.

  It listed `@fluixi/compiler`, `@fluixi/vite-plugin` and
  `vite-plugin-node-polyfills` under `dependencies` while importing none of them
  from `src/` — they exist for the `@fluixi/core/plugins` subpath, which is
  build-time tooling. Declaring them as runtime dependencies of the _runtime_
  package meant every consumer of `@fluixi/core` installed Vite plugins and a Babel
  toolchain (52 MB in this workspace) to render a component. Component libraries
  built on `@fluixi/core` were passing that on to their own users.

  They are now **optional peer dependencies**: use `@fluixi/core/plugins` and you
  need them, otherwise you do not. `@fluixi/start` reaches that subpath through
  `await import('@fluixi/core/plugins')`, so it declares them itself — apps using
  the meta-framework are unaffected, and the standalone Vite templates already
  declared `@fluixi/vite-plugin` as a devDependency.

  `@fluixi/core`'s runtime closure is now `@fluixi/{dom,jsx,reactive,router,server,utils,head}`,
  none of which reach the compiler.

- 8b37811: Render `/` on Cloudflare, Netlify and Vercel instead of serving the shell.

  `dist/client/index.html` sits at the path a prerendered `/` would occupy, so each
  platform's static layer answered the home page with an empty mount element and never
  reached the app: the ASSETS binding on Pages, `preferStatic` on Netlify, the filesystem
  phase on Vercel. Every other route was already correct — nothing exists at `/about`
  unless it was prerendered. The adapters now decide who owns `/` by whether that file
  holds a rendered page, and the worker asks the ASSETS binding only about a prerendered
  path or a path with a file extension, which is the rule the Node adapter already used.

- 059b38b: Render into the shell, not into the prerendered home page.

  `dist/client/index.html` is both the SSR template and the path a prerendered `/` is
  written to, so an app that prerenders its home page rendered every SSR response into
  that page: two mount elements in one document, the home page's head on every route,
  and hydration adopting the wrong one. The build now stashes the shell as
  `dist/server/template.html` before prerendering overwrites it, and both the Node
  handler and the deploy adapters read that when it exists.

- Updated dependencies [f995106]
- Updated dependencies [93421e8]
- Updated dependencies [8da12e6]
- Updated dependencies [93421e8]
- Updated dependencies [a2cf48c]
- Updated dependencies [b747b26]
- Updated dependencies [6fba3ed]
- Updated dependencies [9817f51]
- Updated dependencies [bb5aea1]
- Updated dependencies [21df035]
- Updated dependencies [08635bd]
- Updated dependencies [f0dd4e3]
- Updated dependencies [f2d3779]
- Updated dependencies [6e586c0]
- Updated dependencies [458f2e4]
- Updated dependencies [9817f51]
- Updated dependencies [e035c4e]
- Updated dependencies [3a9607b]
- Updated dependencies [8e1e0f4]
- Updated dependencies [3903be0]
- Updated dependencies [0fdebdd]
- Updated dependencies [4022c74]
- Updated dependencies [33c3574]
  - @fluixi/compiler@1.0.0-alpha.74
  - @fluixi/vite-plugin@1.0.0-alpha.74
  - @fluixi/core@1.0.0-alpha.74
  - @fluixi/dom@1.0.0-alpha.74
  - @fluixi/server@1.0.0-alpha.74
  - @fluixi/head@1.0.0-alpha.41

## 0.1.0-alpha.63

### Patch Changes

- Updated dependencies [93e06ef]
- Updated dependencies [7e98158]
  - @fluixi/compiler@1.0.0-alpha.73
  - @fluixi/dom@1.0.0-alpha.73
  - @fluixi/core@1.0.0-alpha.73
  - @fluixi/server@1.0.0-alpha.73
  - @fluixi/head@1.0.0-alpha.40

## 0.1.0-alpha.62

### Patch Changes

- Updated dependencies [15f7c3c]
  - @fluixi/compiler@1.0.0-alpha.72
  - @fluixi/core@1.0.0-alpha.72
  - @fluixi/dom@1.0.0-alpha.72
  - @fluixi/head@1.0.0-alpha.39
  - @fluixi/server@1.0.0-alpha.72

## 0.1.0-alpha.61

### Patch Changes

- Updated dependencies [ef528ba]
- Updated dependencies [12ea3a5]
- Updated dependencies [e46e9c0]
  - @fluixi/compiler@1.0.0-alpha.71
  - @fluixi/dom@1.0.0-alpha.71
  - @fluixi/core@1.0.0-alpha.71
  - @fluixi/server@1.0.0-alpha.71
  - @fluixi/head@1.0.0-alpha.38

## 0.1.0-alpha.60

### Patch Changes

- Updated dependencies [d27056f]
- Updated dependencies [77ab4cb]
- Updated dependencies [c87db9a]
- Updated dependencies [509f3f2]
- Updated dependencies [b8ef7fc]
- Updated dependencies [4f4895a]
- Updated dependencies [569fe05]
- Updated dependencies [b820700]
- Updated dependencies [2a317dc]
- Updated dependencies [84b1821]
  - @fluixi/compiler@1.0.0-alpha.70
  - @fluixi/core@1.0.0-alpha.70
  - @fluixi/dom@1.0.0-alpha.70
  - @fluixi/server@1.0.0-alpha.70
  - @fluixi/head@1.0.0-alpha.37

## 0.1.0-alpha.59

### Patch Changes

- Updated dependencies [d7bf256]
  - @fluixi/compiler@1.0.0-alpha.69
  - @fluixi/core@1.0.0-alpha.69
  - @fluixi/dom@1.0.0-alpha.69
  - @fluixi/head@1.0.0-alpha.36
  - @fluixi/server@1.0.0-alpha.69

## 0.1.0-alpha.58

### Patch Changes

- Updated dependencies [03acf33]
- Updated dependencies [7f25a39]
  - @fluixi/dom@1.0.0-alpha.68
  - @fluixi/compiler@1.0.0-alpha.68
  - @fluixi/core@1.0.0-alpha.68
  - @fluixi/server@1.0.0-alpha.68
  - @fluixi/head@1.0.0-alpha.35

## 0.1.0-alpha.57

### Patch Changes

- Updated dependencies [09a321e]
  - @fluixi/dom@1.0.0-alpha.67
  - @fluixi/core@1.0.0-alpha.67
  - @fluixi/compiler@1.0.0-alpha.67
  - @fluixi/server@1.0.0-alpha.67
  - @fluixi/head@1.0.0-alpha.34

## 0.1.0-alpha.56

### Patch Changes

- Updated dependencies [8a53f68]
  - @fluixi/dom@1.0.0-alpha.66
  - @fluixi/core@1.0.0-alpha.66
  - @fluixi/compiler@1.0.0-alpha.66
  - @fluixi/server@1.0.0-alpha.66
  - @fluixi/head@1.0.0-alpha.33

## 0.1.0-alpha.55

### Patch Changes

- Updated dependencies [cdc5af9]
- Updated dependencies [0db63d9]
  - @fluixi/dom@1.0.0-alpha.65
  - @fluixi/compiler@1.0.0-alpha.65
  - @fluixi/core@1.0.0-alpha.65
  - @fluixi/server@1.0.0-alpha.65
  - @fluixi/head@1.0.0-alpha.32

## 0.1.0-alpha.54

### Patch Changes

- Updated dependencies [d075630]
- Updated dependencies [ed14cd1]
- Updated dependencies [fb298c7]
- Updated dependencies [13d488e]
  - @fluixi/core@1.0.0-alpha.64
  - @fluixi/compiler@1.0.0-alpha.64
  - @fluixi/dom@1.0.0-alpha.64
  - @fluixi/head@1.0.0-alpha.31
  - @fluixi/server@1.0.0-alpha.64

## 0.1.0-alpha.53

### Patch Changes

- Updated dependencies [9ac3eaa]
- Updated dependencies [310b9d1]
- Updated dependencies [96c211e]
  - @fluixi/dom@1.0.0-alpha.63
  - @fluixi/core@1.0.0-alpha.63
  - @fluixi/compiler@1.0.0-alpha.63
  - @fluixi/server@1.0.0-alpha.63
  - @fluixi/head@1.0.0-alpha.30

## 0.1.0-alpha.52

### Patch Changes

- Updated dependencies [2f99854]
  - @fluixi/dom@1.0.0-alpha.62
  - @fluixi/compiler@1.0.0-alpha.62
  - @fluixi/core@1.0.0-alpha.62
  - @fluixi/server@1.0.0-alpha.62
  - @fluixi/head@1.0.0-alpha.29

## 0.1.0-alpha.51

### Patch Changes

- Updated dependencies [ee9da1c]
  - @fluixi/dom@1.0.0-alpha.61
  - @fluixi/compiler@1.0.0-alpha.61
  - @fluixi/core@1.0.0-alpha.61
  - @fluixi/server@1.0.0-alpha.61
  - @fluixi/head@1.0.0-alpha.28

## 0.1.0-alpha.50

### Patch Changes

- @fluixi/core@1.0.0-alpha.60
- @fluixi/dom@1.0.0-alpha.60
- @fluixi/compiler@1.0.0-alpha.60
- @fluixi/head@1.0.0-alpha.27
- @fluixi/server@1.0.0-alpha.60

## 0.1.0-alpha.49

### Minor Changes

- 725322e: Add on-demand image optimization. `createImageHandler(options)` returns a
  Web `Request` → `Response` handler you mount as an API route: it resizes and
  re-encodes images (AVIF/WebP by `Accept` negotiation), with a target-width
  allow-list, remote-domain allow-listing + local path-traversal guards, immutable
  cache headers, and a small in-memory cache. The codec is pluggable — it uses
  `sharp` when installed, otherwise streams the source through unchanged, so
  `@fluixi/start` never hard-depends on a native module. `imageLoader({ path })`
  produces a matching loader for `@fluixi-ui/image`'s `loader` prop.

### Patch Changes

- @fluixi/core@1.0.0-alpha.59
- @fluixi/dom@1.0.0-alpha.59
- @fluixi/compiler@1.0.0-alpha.59
- @fluixi/head@1.0.0-alpha.26
- @fluixi/server@1.0.0-alpha.59

## 0.1.0-alpha.48

### Patch Changes

- Updated dependencies [3fd0660]
  - @fluixi/core@1.0.0-alpha.58
  - @fluixi/dom@1.0.0-alpha.58
  - @fluixi/compiler@1.0.0-alpha.58
  - @fluixi/head@1.0.0-alpha.25
  - @fluixi/server@1.0.0-alpha.58

## 0.1.0-alpha.47

### Patch Changes

- Updated dependencies [5d92daa]
  - @fluixi/core@1.0.0-alpha.57
  - @fluixi/compiler@1.0.0-alpha.57
  - @fluixi/dom@1.0.0-alpha.57
  - @fluixi/head@1.0.0-alpha.24
  - @fluixi/server@1.0.0-alpha.57

## 0.1.0-alpha.46

### Minor Changes

- d9a5cc4: Re-export `html` and `svg` from `@fluixi/start`, so a meta-framework app can author
  templates without JSX: `import { html } from '@fluixi/start'`.

### Patch Changes

- Updated dependencies [59ddb69]
- Updated dependencies [59ddb69]
- Updated dependencies [8b7f398]
- Updated dependencies [e183e9a]
- Updated dependencies [59ddb69]
- Updated dependencies [4b911bc]
- Updated dependencies [59ddb69]
- Updated dependencies [e09bc16]
  - @fluixi/core@1.0.0-alpha.56
  - @fluixi/dom@1.0.0-alpha.56
  - @fluixi/compiler@1.0.0-alpha.56
  - @fluixi/server@1.0.0-alpha.56
  - @fluixi/head@1.0.0-alpha.23

## 0.1.0-alpha.45

### Patch Changes

- daa7af2: Update READMEs for public npm: drop the GitHub Packages `.npmrc` install instructions (no auth needed on public npm) and replace the GitHub Packages registry badge with an npm version badge.
- Updated dependencies [5cfb7a6]
- Updated dependencies [daa7af2]
  - @fluixi/dom@1.0.0-alpha.55
  - @fluixi/server@1.0.0-alpha.55
  - @fluixi/compiler@1.0.0-alpha.55
  - @fluixi/core@1.0.0-alpha.55
  - @fluixi/head@0.1.0-alpha.22

## 0.1.0-alpha.44

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/compiler@1.0.0-alpha.54
  - @fluixi/core@1.0.0-alpha.54
  - @fluixi/dom@1.0.0-alpha.54
  - @fluixi/head@0.1.0-alpha.21
  - @fluixi/server@1.0.0-alpha.54

## 0.1.0-alpha.43

### Patch Changes

- Updated dependencies [370feff]
  - @fluixi/core@1.0.0-alpha.53
  - @fluixi/compiler@1.0.0-alpha.53
  - @fluixi/dom@1.0.0-alpha.53
  - @fluixi/head@0.1.0-alpha.20
  - @fluixi/server@1.0.0-alpha.53

## 0.1.0-alpha.42

### Patch Changes

- Updated dependencies [0eecc3c]
  - @fluixi/dom@1.0.0-alpha.52
  - @fluixi/compiler@1.0.0-alpha.52
  - @fluixi/core@1.0.0-alpha.52
  - @fluixi/server@1.0.0-alpha.52
  - @fluixi/head@0.1.0-alpha.19

## 0.1.0-alpha.41

### Patch Changes

- Updated dependencies [8d66341]
  - @fluixi/dom@1.0.0-alpha.51
  - @fluixi/compiler@1.0.0-alpha.51
  - @fluixi/core@1.0.0-alpha.51
  - @fluixi/server@1.0.0-alpha.51
  - @fluixi/head@0.1.0-alpha.18

## 0.1.0-alpha.40

### Patch Changes

- f93989f: Fix page content duplicated on hydration when `seo()`/`useHead()` is used in dev.

  `@fluixi/head` carries a page's SEO back from SSR as an inert `<!--fh:…-->` comment prepended to the body; the server lifts it into `<head>` and strips it via `injectAppAndHead`. The prod adapter and prerender did this, but the dev server used plain `injectApp`, leaving the marker as the mount root's first child. The hydration cursor started on that comment, never matched the app's first element, and rebuilt the whole tree next to the server DOM — a duplicated page. (Dev also emitted no head tags as a result.)

  Dev now uses `injectAppAndHead`, so the marker is lifted into `<head>`/`<html>` exactly like prod. As a safety net for streaming/custom servers, `stripHeadMarker` drops any stray leading `fh:` comment on the client before hydration.

- Updated dependencies [f93989f]
  - @fluixi/head@0.1.0-alpha.17
  - @fluixi/core@1.0.0-alpha.50
  - @fluixi/server@1.0.0-alpha.50
  - @fluixi/dom@1.0.0-alpha.50
  - @fluixi/compiler@1.0.0-alpha.50

## 0.1.0-alpha.39

### Patch Changes

- Updated dependencies [6620476]
  - @fluixi/head@0.1.0-alpha.16
  - @fluixi/core@1.0.0-alpha.49
  - @fluixi/server@1.0.0-alpha.49
  - @fluixi/dom@1.0.0-alpha.49
  - @fluixi/compiler@1.0.0-alpha.49

## 0.1.0-alpha.38

### Patch Changes

- Updated dependencies [7da8345]
  - @fluixi/dom@1.0.0-alpha.48
  - @fluixi/compiler@1.0.0-alpha.48
  - @fluixi/core@1.0.0-alpha.48
  - @fluixi/server@1.0.0-alpha.48
  - @fluixi/head@0.1.0-alpha.15

## 0.1.0-alpha.37

### Patch Changes

- Updated dependencies [3ec6f21]
  - @fluixi/compiler@1.0.0-alpha.47
  - @fluixi/core@1.0.0-alpha.47
  - @fluixi/dom@1.0.0-alpha.47
  - @fluixi/head@0.1.0-alpha.14
  - @fluixi/server@1.0.0-alpha.47

## 0.1.0-alpha.36

### Patch Changes

- Updated dependencies [8ff7815]
  - @fluixi/compiler@1.0.0-alpha.46
  - @fluixi/core@1.0.0-alpha.46
  - @fluixi/dom@1.0.0-alpha.46
  - @fluixi/head@0.1.0-alpha.13
  - @fluixi/server@1.0.0-alpha.46

## 0.1.0-alpha.35

### Patch Changes

- Updated dependencies [536a75e]
  - @fluixi/compiler@1.0.0-alpha.45
  - @fluixi/core@1.0.0-alpha.45
  - @fluixi/dom@1.0.0-alpha.45
  - @fluixi/head@0.1.0-alpha.12
  - @fluixi/server@1.0.0-alpha.45

## 0.1.0-alpha.34

### Patch Changes

- Updated dependencies [aa82713]
  - @fluixi/dom@1.0.0-alpha.44
  - @fluixi/compiler@1.0.0-alpha.44
  - @fluixi/core@1.0.0-alpha.44
  - @fluixi/server@1.0.0-alpha.44
  - @fluixi/head@0.1.0-alpha.11

## 0.1.0-alpha.33

### Patch Changes

- Updated dependencies [71d770c]
  - @fluixi/compiler@1.0.0-alpha.43
  - @fluixi/dom@1.0.0-alpha.43
  - @fluixi/core@1.0.0-alpha.43
  - @fluixi/server@1.0.0-alpha.43
  - @fluixi/head@0.1.0-alpha.10

## 0.1.0-alpha.32

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
- Updated dependencies [3f0e665]
  - @fluixi/compiler@1.0.0-alpha.42
  - @fluixi/server@1.0.0-alpha.42
  - @fluixi/core@1.0.0-alpha.42
  - @fluixi/head@0.1.0-alpha.9
  - @fluixi/dom@1.0.0-alpha.42

## 0.1.0-alpha.31

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.41
- @fluixi/core@1.0.0-alpha.41
- @fluixi/dom@1.0.0-alpha.41
- @fluixi/head@0.1.0-alpha.8
- @fluixi/server@1.0.0-alpha.41

## 0.1.0-alpha.30

### Patch Changes

- Updated dependencies [853c4bb]
  - @fluixi/dom@1.0.0-alpha.40
  - @fluixi/compiler@1.0.0-alpha.40
  - @fluixi/core@1.0.0-alpha.40
  - @fluixi/server@1.0.0-alpha.40
  - @fluixi/head@0.1.0-alpha.7

## 0.1.0-alpha.29

### Patch Changes

- Updated dependencies [0d139c4]
  - @fluixi/dom@1.0.0-alpha.39
  - @fluixi/compiler@1.0.0-alpha.39
  - @fluixi/core@1.0.0-alpha.39
  - @fluixi/server@1.0.0-alpha.39
  - @fluixi/head@0.1.0-alpha.6

## 0.1.0-alpha.28

### Patch Changes

- Updated dependencies [30e6ecc]
  - @fluixi/dom@1.0.0-alpha.38
  - @fluixi/compiler@1.0.0-alpha.38
  - @fluixi/core@1.0.0-alpha.38
  - @fluixi/server@1.0.0-alpha.38
  - @fluixi/head@0.1.0-alpha.5

## 0.1.0-alpha.27

### Patch Changes

- Updated dependencies [fd5a896]
- Updated dependencies [63976b7]
  - @fluixi/dom@1.0.0-alpha.37
  - @fluixi/core@1.0.0-alpha.37
  - @fluixi/compiler@1.0.0-alpha.37
  - @fluixi/server@1.0.0-alpha.37
  - @fluixi/head@0.1.0-alpha.4

## 0.1.0-alpha.26

### Patch Changes

- Updated dependencies [9b6215f]
  - @fluixi/dom@1.0.0-alpha.36
  - @fluixi/compiler@1.0.0-alpha.36
  - @fluixi/core@1.0.0-alpha.36
  - @fluixi/server@1.0.0-alpha.36
  - @fluixi/head@0.1.0-alpha.3

## 0.1.0-alpha.25

### Patch Changes

- bdcc4a5: Flash-free hydration for lazy file-routes — preload the route chunk before hydrating.

  A server-rendered app with code-split file-routes used to render twice on hydration: the lazy boundary rendered empty on the first pass (chunk not loaded), then re-rendered when the chunk resolved a tick later — building a fresh subtree next to the server DOM instead of adopting it. The app flashed and, with auto-hydration on, duplicated.

  Now the matched route's chunk is downloaded and awaited _before_ hydration, so each lazy route resolves synchronously on the first pass and adopts the server DOM in place.

  - `lazy()` renders synchronously once its module is resolved (no resource/Suspense/late re-render); a cold client-side navigation still suspends and shows the fallback.
  - New `preloadRoutes(routes, pathname)` (`@fluixi/core/router-next`, re-exported by `@fluixi/start/router`): matches the URL and preloads the matched route's lazy chunks.
  - `startClient` takes a `routes` option and awaits `preloadRoutes` before hydrating. Passing `routes` also enables auto-hydration of a server-rendered (non-empty) root — flash-free with no extra config. Apps without it keep the plain client-render path.

  ```ts
  // entry-client.ts
  import App, { appRoutes } from './app';
  startClient(App, { root: '#root', routes: appRoutes });
  ```

  The SSR scaffold (`create-fluixi`) wires this up and ships a small `seo()` example in the index route.

- Updated dependencies [f3122c2]
- Updated dependencies [bdcc4a5]
  - @fluixi/core@1.0.0-alpha.35
  - @fluixi/dom@1.0.0-alpha.35
  - @fluixi/compiler@1.0.0-alpha.35
  - @fluixi/head@0.1.0-alpha.2
  - @fluixi/server@1.0.0-alpha.35

## 0.1.0-alpha.24

### Minor Changes

- bec9d21: New `@fluixi/head` — built-in reactive, SSR-first SEO/document-head engine. Typed title/meta/OG/Twitter/JSON-LD/canonical/hreflang/icons/verification, last-wins dedupe with nested layout inheritance, SSR serialize + client reconcile (reuses server tags by key, no hydration mismatch, signals update the document live), JSON-LD helpers, head components, and robots.txt/sitemap.xml generators.

  Re-exported as `@fluixi/start/head` (same pattern as `@fluixi/start/router`) so apps have one import surface.

- 6f8a9d4: Wire @fluixi/head into the framework (zero-config SEO). renderRequestAsync collects seo()/useHead metadata during SSR and carries it back; @fluixi/start lifts it into <head>/<html> for SSR + prerender. startClient mounts the head registry so it hydrates (server tags reused by key) and updates live, including on route transitions (seo() auto-disposes on owner unmount). Apps just call seo({...}) — no setup.

### Patch Changes

- Updated dependencies [f0926b6]
- Updated dependencies [bec9d21]
- Updated dependencies [6f8a9d4]
- Updated dependencies [0c2ecb7]
  - @fluixi/dom@1.0.0-alpha.34
  - @fluixi/head@0.1.0-alpha.1
  - @fluixi/server@1.0.0-alpha.34
  - @fluixi/core@1.0.0-alpha.34
  - @fluixi/compiler@1.0.0-alpha.34

## 0.1.0-alpha.23

### Patch Changes

- Updated dependencies [6dfebcd]
  - @fluixi/server@1.0.0-alpha.33
  - @fluixi/core@1.0.0-alpha.33
  - @fluixi/dom@1.0.0-alpha.33
  - @fluixi/compiler@1.0.0-alpha.33

## 0.1.0-alpha.22

### Minor Changes

- d7a38ba: File-based API routes. Files under `src/api/**` (configurable via `apiDir`) export HTTP-method
  handlers — `export function GET(request, { params }) { … }` (also POST/PUT/PATCH/DELETE) — served at
  `/api/*`. The file path is the route: `api/users/[id].ts` → `/api/users/:id`, `api/files/[...path].ts`
  → catch-all, `api/index.ts` → `/api`. Handlers return a Web `Response` (or any value → JSON). Static
  routes beat dynamic beat catch-all; a wrong method is `405`, an unknown `/api/*` path is `404`. Dev
  auto-wires it; prod dispatches via the entry-server re-export
  `export { isApiRequest, handleApiRequest } from 'virtual:fluixi-api'`. New `@fluixi/start/api` entry
  exports the matcher/dispatch helpers.
- d7a38ba: HTTP interceptors — a request/response/error pipeline around `fetch` (Angular-style).
  `addInterceptor({ request, response, error })` registers cross-cutting logic: attach auth headers,
  unwrap or refresh-on-401 responses, log, or recover from network errors. Server-function RPC calls
  route through the chain automatically once any interceptor is registered, and `fetchWithInterceptors`
  is exported for your own data fetching. `addInterceptor` returns a remover; `clearInterceptors`
  resets.
- d7a38ba: Static Site Generation. Set `prerender` in `fluixi.config` and `fluixi build` renders routes to
  static HTML in `dist/client` (deploy to any static host; pages hydrate on the client). `true`
  prerenders `/` and crawls internal `<a href>` links; `{ routes, crawl }` sets explicit paths (for
  dynamic routes with no incoming link) and toggles crawling. Each page is rendered through the real
  production handler, so the static output is byte-identical to what `fluixi start` serves — assets,
  `__FX_DATA__`, hydration markers and all. Also exported `prerender()` for programmatic use.

### Patch Changes

- Updated dependencies [de45743]
  - @fluixi/server@1.0.0-alpha.32
  - @fluixi/core@1.0.0-alpha.32
  - @fluixi/dom@1.0.0-alpha.32
  - @fluixi/compiler@1.0.0-alpha.32

## 0.1.0-alpha.21

### Patch Changes

- Updated dependencies [90ae430]
  - @fluixi/dom@1.0.0-alpha.31
  - @fluixi/core@1.0.0-alpha.31
  - @fluixi/server@1.0.0-alpha.31
  - @fluixi/compiler@1.0.0-alpha.31

## 0.1.0-alpha.20

### Minor Changes

- 8cb37e5: Built-in i18n — `@fluixi/core/i18n`. Reactive, SSR-correct internationalization, no dependency.

  ```ts
  import { createI18n } from '@fluixi/core/i18n';

  const i18n = createI18n({
    locale: 'en',
    locales: ['en', 'fr'] as const,
    messages: { en, fr },
  });
  export const { t, n, d, locale, setLocale } = i18n;

  t('welcome', { name: 'Ada' }); // interpolation
  t('cart.items', { count: 3 }); // pluralization via Intl.PluralRules
  n(1234.5);
  d(new Date()); // locale-aware number/date (Intl)
  setLocale('fr'); // reactive — every t() re-evaluates
  ```

  - **SSR request-scoped locale** — per-request on the server (kept in the RequestContext, not a
    shared signal, so two concurrent requests in different languages never bleed); a reactive
    module signal on the client; the server-resolved locale is serialized into `__FX_DATA__` for
    the client to seed (no flash, no hydration mismatch).
  - **Resolves without the reactive owner-context chain** — `t()` reads the locale from the
    request context / module signal, NOT `useContext`, so it works in lazy routes, server
    functions, and loaders. (This is exactly why it sidesteps the "useLocale() undefined under SSR
    on a lazy route" failure — there's no provider owner-chain to lose.)
  - **Platform-native** — pluralization via `Intl.PluralRules`, numbers/dates via
    `Intl.NumberFormat`/`Intl.DateTimeFormat`. Nested **and** flat dotted keys, `{param}`
    interpolation, fallback-locale, and a `detectLocale(acceptLanguage, locales)` helper.

  `@fluixi/start` — **translation auto-discovery + config**. `fluixi.config`'s `i18n` option
  (default `src/i18n`, or `false` to disable, or `{ dir, defaultLocale, locales }`) makes the
  build scan `<dir>/<locale>.json` and expose them as `virtual:fluixi-i18n`
  (`{ messages, locales, defaultLocale }`) — feed it to `createI18n` in one line. The virtual
  modules' TypeScript declarations (`virtual:fluixi-i18n` AND `virtual:fluixi-server-fns`) are now
  **auto-generated** into `src/fluixi-start-env.d.ts` (like the routes plugin's `fluixi-env.d.ts`),
  so apps never hand-write a `declare module` block.

- 2822fc8: i18n auto-discovery now emits **typed** `virtual:fluixi-i18n` declarations. The generated
  `src/fluixi-start-env.d.ts` types `messages` off the actual files —
  `(typeof import('./i18n/en.json'))['default']` per locale, plus a literal `locales` tuple and
  `defaultLocale` — so translation keys flow all the way from `src/i18n/*.json` into
  `createI18n({ messages })` and `t('…')` autocompletes them. Falls back to the open
  `Record<string, unknown>` shape when no JSON files exist yet (or a configured locale has no
  file). Relies on `resolveJsonModule` (Vite's default tsconfig enables it).

### Patch Changes

- Updated dependencies [8cb37e5]
- Updated dependencies [da3aace]
  - @fluixi/core@1.0.0-alpha.30
  - @fluixi/dom@1.0.0-alpha.30
  - @fluixi/compiler@1.0.0-alpha.30
  - @fluixi/server@1.0.0-alpha.30

## 0.1.0-alpha.19

### Minor Changes

- efcf341: Dependency injection + SPA mode — `@fluixi/start` now covers the full app architecture.

  **`@fluixi/start/di` — dependency injection, Angular-style but SSR-correct + reactive.**

  ```ts
  import {
    injectionToken,
    inject,
    provide,
    provideRoot,
  } from '@fluixi/start/di';

  const Logger = injectionToken<Logger>('Logger', {
    factory: () => new ConsoleLogger(),
  });
  class UserService {
    #log = inject(Logger);
  } // function injection — no decorators
  const Users = injectionToken('Users', { factory: () => new UserService() });

  // component / route / server function:
  const users = inject(Users);
  provide([{ provide: Theme, useClass: DarkTheme }]); // owner-scoped, disposed on unmount
  provideRoot([{ provide: Db, useFactory: () => new Db() }]);
  ```

  - `useValue` / `useClass` / `useFactory` (with `deps`) / `useExisting`; tree-shakable token
    `factory` (≈ `providedIn: 'root'`); circular-dependency detection; `onDestroy()` lifecycle.
  - **The reactive owner tree IS the injector hierarchy** — `provide()` attaches a child
    injector to the component's owner; `inject()` walks it; it disposes with the component.
  - **SSR request isolation, for free** — a "root" service is a singleton on the client but a
    FRESH instance per request on the server (the root injector lives in the per-request
    context), so stateful root services never leak across concurrent SSR requests.
  - `runInInjectionContext` to resolve outside a component (e.g. inside a server function).
  - Client-safe (imports only `@fluixi/core` + `@fluixi/dom`'s pure `getRequestContext`).

  **SPA mode — one toolchain for SPA _and_ SSR apps.** `defineConfig({ ssr: false })` serves the
  static shell and lets the client render, while keeping the full @fluixi/start server: file
  routing, middleware, env loading, and `/_server` server functions. Same app code either way —
  flip the flag to choose where first paint happens. `dev`/`build`/`start` all honor it (a SPA
  without a server entry skips the server bundle; with one, server functions still work).

### Patch Changes

- @fluixi/dom@1.0.0-alpha.29
- @fluixi/core@1.0.0-alpha.29
- @fluixi/compiler@1.0.0-alpha.29
- @fluixi/server@1.0.0-alpha.29

## 0.1.0-alpha.18

### Minor Changes

- 663f0b4: Env management + server-function auto-wiring.

  **Env management** — `fluixi dev|build|start` now load `.env` files into `process.env` for
  server code (loaders, `"use server"` functions). Security model is Vite-aligned: only
  `VITE_`-prefixed vars reach the client (`import.meta.env`, inlined into the browser bundle);
  everything else is **server-only** via `process.env` and never ships to the web. Real (OS)
  env vars win, so deploys/secret managers override files. Apps stop hand-rolling dotenv
  loaders (and stop risking secret leaks). `loadServerEnv(root, mode)` exported from
  `@fluixi/start`.

  **Server-function auto-wiring** — `virtual:fluixi-server-fns` now re-exports the dispatcher
  (`isServerFnRequest` / `handleServerFn`), and `fluixi dev` routes `/_server` through it
  directly. So a `"use server"` function just works — no need to manually
  `export { isServerFnRequest, handleServerFn }` from `entry-server`. (Previously, missing that
  re-export made the RPC fall through to the SPA catch-all and return the HTML page — a silent,
  confusing failure.) Prod (`fluixi start`) still reads the dispatcher off the built
  `entry-server`; the canonical one-liner is now `export { isServerFnRequest, handleServerFn }
from 'virtual:fluixi-server-fns'` (registers the fns and exposes the dispatcher in one import).

### Patch Changes

- Updated dependencies [663f0b4]
  - @fluixi/compiler@1.0.0-alpha.28
  - @fluixi/core@1.0.0-alpha.28
  - @fluixi/server@1.0.0-alpha.28

## 0.1.0-alpha.17

### Patch Changes

- @fluixi/core@1.0.0-alpha.27
- @fluixi/compiler@1.0.0-alpha.27
- @fluixi/server@1.0.0-alpha.27

## 0.1.0-alpha.16

### Patch Changes

- @fluixi/core@1.0.0-alpha.26
- @fluixi/compiler@1.0.0-alpha.26
- @fluixi/server@1.0.0-alpha.26

## 0.1.0-alpha.15

### Minor Changes

- 042d86a: Add a typed per-request `locals` seam + the middleware→render bridge.

  `RequestEvent` now carries a `locals` bag (initialized by `createRequestContext`), with
  an augmentable `RequestLocals` interface and a `getLocals()` accessor. This is the
  framework seam middleware writes and loaders / server functions / the render read back —
  the basis for request-scoped data like the authenticated user, without prop threading.
  `getLocals()` returns a fresh empty object off-request so reads never throw.

  The bridge: middleware runs on the raw platform request, outside the render's context, so
  `getRequestLocals(request)` exposes a per-request locals bag (a `WeakMap`, request-keyed →
  concurrency-isolated, GC-friendly). Middleware writes `getRequestLocals(request).x = …`;
  `createRequestContext` adopts that same bag when the app forwards `request` on the render
  event (`renderRequestAsync(App, { url, request })`). `@fluixi/start` re-exports
  `getRequestLocals`/`getLocals` and now passes `request` to the string render path (the
  streaming path already did), so apps that forward it get request-scoped locals end-to-end.
  Re-exported from `@fluixi/server` too.

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.25
- @fluixi/core@1.0.0-alpha.25
- @fluixi/server@1.0.0-alpha.25

## 0.1.0-alpha.14

### Patch Changes

- Updated dependencies [aaad625]
  - @fluixi/core@1.0.0-alpha.24
  - @fluixi/compiler@1.0.0-alpha.24
  - @fluixi/server@1.0.0-alpha.24

## 0.1.0-alpha.13

### Patch Changes

- Updated dependencies [982f86b]
  - @fluixi/core@1.0.0-alpha.23
  - @fluixi/compiler@1.0.0-alpha.23
  - @fluixi/server@1.0.0-alpha.23

## 0.1.0-alpha.12

### Patch Changes

- Updated dependencies [91e6e33]
  - @fluixi/server@1.0.0-alpha.22
  - @fluixi/core@1.0.0-alpha.22
  - @fluixi/compiler@1.0.0-alpha.22

## 0.1.0-alpha.11

### Patch Changes

- Updated dependencies [12dd974]
  - @fluixi/core@1.0.0-alpha.21
  - @fluixi/compiler@1.0.0-alpha.21
  - @fluixi/server@1.0.0-alpha.21

## 0.1.0-alpha.10

### Patch Changes

- Updated dependencies [8640cac]
  - @fluixi/core@1.0.0-alpha.20
  - @fluixi/server@1.0.0-alpha.20
  - @fluixi/compiler@1.0.0-alpha.20

## 0.1.0-alpha.9

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.19
- @fluixi/core@1.0.0-alpha.19
- @fluixi/server@1.0.0-alpha.19

## 0.1.0-alpha.8

### Patch Changes

- Updated dependencies [8f4c8cf]
  - @fluixi/core@1.0.0-alpha.18
  - @fluixi/compiler@1.0.0-alpha.18
  - @fluixi/server@1.0.0-alpha.18

## 0.1.0-next.7

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

- @fluixi/compiler@1.0.0-next.17
- @fluixi/core@1.0.0-next.17
- @fluixi/server@1.0.0-next.17

## 0.1.0-next.6

### Minor Changes

- 43a36e2: `getRequestEvent()` now works inside a `"use server"` function — access the request,
  headers, and cookies:

  ```ts
  import { getRequestEvent } from '@fluixi/server';

  const whoami = async () => {
    'use server';
    const req = getRequestEvent()?.request as Request;
    return req.headers.get('user-agent');
  };
  ```

  The RPC dispatcher runs the function inside `@fluixi/server`'s request context (wired by
  a server-only `@fluixi/start/server-fn-setup` bridge that `virtual:fluixi-server-fns`
  imports, keeping the `@fluixi/start/server-fn` runtime client-safe). Response headers set
  on the event (e.g. `Set-Cookie`) are returned with the RPC response.

### Patch Changes

- eb95b6c: Docs: rewrite the package READMEs in the canonical format (logo, badges, overview,
  install, usage, license) and bring them up to date — streaming SSR, middleware, server
  functions, `fluixi generate`, and the SSR/SPA scaffold. Adds the missing `@fluixi/create`
  README. (The root README's package list + architecture were also corrected.)
- f30d5e9: Server functions in lazy routes now register reliably. `serverFunctionsVitePlugin`
  provides `virtual:fluixi-server-fns` — side-effect imports of every module containing a
  `"use server"` directive (found by scanning `src/`). The server entry imports it, so all
  server functions register at startup, including those in lazy-loaded routes that would
  otherwise register only when their chunk loads (causing an RPC registry miss → 404). The
  client never imports the virtual module.
- 3932e9d: SSR fixes:

  - **`<Form>` and `<Link>` render real elements on the server.** Both returned an HTML
    _string_ on the server, which the serializer escaped as text (`&lt;form&gt;…`) — breaking
    the element and the hydration cursor. They now build a real element via the runtime
    (server `ServerNode` / client DOM).
  - **`@fluixi/start`**: `/* @vite-ignore */` on the runtime dynamic imports
    (config/entry-server/middleware) to silence Vite's import-analysis warnings in `dev`.

- Updated dependencies [42730d1]
- Updated dependencies [ef9231f]
- Updated dependencies [ea5c098]
- Updated dependencies [eb95b6c]
- Updated dependencies [43a36e2]
- Updated dependencies [f30d5e9]
- Updated dependencies [3932e9d]
  - @fluixi/core@1.0.0-next.16
  - @fluixi/server@1.0.0-next.16
  - @fluixi/compiler@1.0.0-next.16

## 0.1.0-next.5

### Minor Changes

- 53ba1b0: Server functions — `"use server"`. A function carrying the directive runs only on the
  server and is callable from the client over RPC:

  ```ts
  const getUser = async (id) => {
    'use server';
    return db.users.find(id);
  };
  ```

  - `@fluixi/compiler`: `serverFunctionsVitePlugin` + `transformServerFunctions` apply the
    directive transform per build — the **client** gets an RPC stub (`$$createServerReference`),
    the **server** keeps the body and registers it (`$$registerServerFn`) under a stable id
    shared by both builds. Server-only code never ships to the client.
  - `@fluixi/start`: `@fluixi/start/server-fn` runtime (registry + stub + dispatcher) and a
    `/_server` RPC endpoint wired into `dev` and `start` (with same-origin CSRF protection).
    The dispatcher rides on the entry-server module's exports so it shares the app's
    registry. The plugin is enabled by default in start apps.

  Note: a server function must live in a module reachable from the server entry's eager
  graph to be registered (lazy-route registration via a manifest is a follow-up).

### Patch Changes

- Updated dependencies [53ba1b0]
  - @fluixi/compiler@1.0.0-next.15
  - @fluixi/core@1.0.0-next.15
  - @fluixi/server@1.0.0-next.15

## 0.1.0-next.4

### Patch Changes

- Updated dependencies [bbf21b9]
- Updated dependencies [bbf21b9]
  - @fluixi/server@1.0.0-next.14
  - @fluixi/core@1.0.0-next.14

## 0.1.0-next.3

### Minor Changes

- ccf61af: Add the `@fluixi/start/router` subpath, re-exporting `@fluixi/kettlejs/router-next`
  (Router, Outlet, Link, the hooks, `createMemoryHistory`/`createBrowserHistory`, the
  data layer, types). Apps get routing from the meta-framework's own surface — a single,
  stable dependency — instead of reaching into kettlejs internals:

  ```ts
  import { Router, Outlet, createMemoryHistory } from '@fluixi/start/router';
  ```

  Framework primitives (Suspense, lazy, signals, components) still come from
  `@fluixi/kettlejs`; only routing lives here.

## 0.1.0-next.2

### Minor Changes

- 7d38a50: Add request middleware / guards. A `src/middleware.ts` that default-exports
  `defineMiddleware([...])` runs a `(request, next) => Response` chain before SSR, in
  both `fluixi dev` and `fluixi start`. A middleware can short-circuit (return a
  Response without calling `next` — auth redirects, 401s, rewrites) or call `next()`
  and adjust the downstream response (headers, etc.). Runtime-neutral (Web `Request`/
  `Response`).

  - New `defineMiddleware` / `composeMiddleware` / `normalizeMiddleware` + `Middleware`
    / `MiddlewareNext` types, exported from `@fluixi/start`.
  - `fluixi build` emits `dist/server/middleware.js` when `src/middleware.ts` exists;
    `createProdHandler` composes it around the renderer. Dev loads it per request via
    `ssrLoadModule` so edits hot-reload. Middleware errors become a 500 (guarded).
  - New `middleware` config option (default `src/middleware.ts`).

- eb302cb: Streaming SSR. If `src/entry-server.ts` exports `renderStream(url, request)` (a web
  `ReadableStream<Uint8Array>` of the app body — e.g. via `@fluixi/server`'s
  `renderToBodyStream`), `fluixi dev` and `fluixi start` stream the response: the
  `index.html` head is flushed immediately (the browser starts fetching assets while the
  server awaits data loaders), then the app body is piped into the mount point, then the
  tail. Falls back to the string `render` export when `renderStream` isn't present, and
  composes with middleware. Adds `splitTemplate` / `streamDocument` / `StreamRenderFn`.
- 992c196: Support `fluixi.config.ts` (TypeScript config). `loadConfig` now probes
  `fluixi.config.{ts,mts,mjs,js}` and bundles a TypeScript config on the fly with
  esbuild (bare imports kept external so `import { defineConfig } from '@fluixi/start'`
  and node builtins resolve from the app; relative imports are bundled in), then
  imports it and cleans up the temp file. Plain ESM configs still import directly, and
  no config at all still works (every field has a default).

### Patch Changes

- Updated dependencies [2b6fcd3]
- Updated dependencies [2b6fcd3]
- Updated dependencies [eb302cb]
  - @fluixi/kettlejs@0.4.0-next.13
  - @fluixi/server@0.3.0-next.13

## 0.1.0-next.1

### Minor Changes

- 13d41ee: Deploy adapters (M1-rest). Adds the runtime-neutral production path on top of the fetch handler:

  - `createProdHandler(config)` — builds the SSR `FetchHandler` from a `fluixi build` output (dist/server + dist/client). The same handler runs on Node, Bun, Deno, and edge/worker runtimes.
  - `serveNode(handler, opts)` + `withStaticFiles(handler, dir)` — the Node reference adapter (http + static files from disk).
  - An `Adapter` interface with two reference implementations: `nodeAdapter` (listen + static) and `webAdapter` (`{ fetch }` export for edge/Bun/Deno/Cloudflare; assets served by the platform).

  `fluixi start` is now just `serveNode(withStaticFiles(createProdHandler(), dist/client))`. `dev` and `build` are validated end-to-end; the production `start` path is blocked on a separate SSR/web-components issue (`router-next` pulls `@fluixi/lit`, which references `HTMLElement` at module init in the bundled server build — needs the lit SSR DOM shim).

### Patch Changes

- Updated dependencies [13d41ee]
  - @fluixi/kettlejs@0.4.0-next.12
  - @fluixi/server@0.3.0-next.12

## 0.1.0-next.0

### Minor Changes

- 1a15bce: Add the Fluixi meta-framework (walking skeleton). `@fluixi/start` is the runtime that sits on top of `@fluixi/kettlejs`: `dev` (Vite-middleware SSR dev server with shared-HMR + crash guards), `build` (client + server bundles), and `start` (production SSR server). All rendering flows through a runtime-neutral Web `Request → Response` handler (`createRequestHandler`), with Node as a thin bridge (`toNodeHandler`/`nodeToRequest`/`sendResponse`) — the seam future edge/worker/Bun/Deno adapters plug into. It injects the kettlejs build plugins (file routing + JSX/SSR transform) for zero-config setup, and exposes `defineConfig`/`loadConfig` + conventions (src/entry-server.ts, index.html with `<div id="root">`). `@fluixi/cli` is the `fluixi` command-line tool (`fluixi dev|build|start`) that delegates to it.

### Patch Changes

- Updated dependencies [1a15bce]
  - @fluixi/kettlejs@0.4.0-next.11
  - @fluixi/server@0.3.0-next.11
