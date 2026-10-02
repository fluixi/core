# @fluixi/create

## 0.1.0-alpha.14

### Minor Changes

- c278b4c: `$storage` stands for `useStorage`, `$asyncStorage` stands for `useAsyncStorage`, and `$persisted` stands for `persisted` from `@fluixi/core/storage`.

### Patch Changes

- cd49ddc: New apps now ignore the `.fluixi` folder that `fluixi build` generates.
- 3a20e09: The new app's `fluixi.d.ts` now declares every reactive intrinsic from the compiler's table and the compiler exports them via `@fluixi/compiler/intrinsics`.

## 0.1.0-alpha.13

### Minor Changes

- 5796529: `create-fluixi` now allows SSR apps to start with authentication using `--auth=oauth2|better-auth|none` together with `--provider` and `--tokens`, and new apps include TypeScript so `fluixi check` runs.

## 0.1.0-alpha.12

### Patch Changes

- 26aa684: A fluixi-css app is generated with a `layers.css` that declares the cascade-layer order, imported ahead of any component CSS. A layer ranks by where it is first declared and an undeclared one ranks last, so without this the engine's `flx.base` reset outranks the `@fluixi-ui` components it belongs under.
- 5b18653: Generated apps use the `$signal`/`$resource` intrinsics, navigate with `<Link>` rather than `<a href>`, and ship a `fluixi.d.ts` so an editor knows the intrinsics before the app has been run. The fluixi-css stylesheet now carries `@fluixi base/utilities/components` and its own `@theme`, so no `fluixi.css.config.js` is generated. `resource()` accepts the single-fetcher form again: it borrowed its parameters from `createResource`, which collapses an overloaded function to its last signature.

## 0.1.0-alpha.11

### Patch Changes

- afa9ed7: The generated stylesheet now matches the selected CSS engine, including the correct dark variant, @source scan, empty @theme, appropriate imports, and the @fluixi-ui token sheet is placed at `@fluixi-ui/tokens/tokens.css` before the app's own styles.

## 0.1.0-alpha.10

### Patch Changes

- 51d1d9c: The generator now proceeds past the project name, prompting for a component library and styling choice (with flags like `--ui`, `--no-ui`, `--tailwind`, `--fluixi-css`, `--no-css`) and accepts both Return and Enter keys.
- a2f0eb8: fluixi.config.ts now accepts the new options `vitePlugin` and `plugins`, allowing configuration of the fluixi Vite plugin options and additional Vite plugins.

## 0.1.0-alpha.9

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

## 0.1.0-alpha.8

### Patch Changes

- bc46945: Name an adapter in the scaffolded SSR config.

  A new app left `adapter` unset, so `fluixi build` fell back to Vite's own bundling
  rather than `nodeAdapter`'s `'external'` — the framework was copied into
  `dist/server` instead of staying an import next to `node_modules`, which is the wrong
  trade for the Node process the template's own `start` script runs. The config names
  `nodeAdapter` now and says where to swap in a deploy target.

## 0.1.0-alpha.7

### Minor Changes

- 151b132: Scaffold html`` -only projects. `create-fluixi` now asks for a template syntax (JSX or
html ``) alongside the SSR/SPA mode — pass `--jsx` / `--html` to skip the prompt. The
  html`` variant is JSX-free: plain `.ts` sources and a tsconfig without `jsx`, useful when
you don't want JSX configured. Every generated app now includes `@fluixi/ts-plugin` (dev
dependency + `tsconfig` plugin) for html`` editor support, and the `@fluixi/*` template
  dependencies now track the `alpha` dist-tag.

## 0.1.0-alpha.6

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.

## 0.1.0-alpha.5

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`

## 0.1.0-alpha.4

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

## 0.1.0-alpha.3

### Patch Changes

- 2eed6f6: Fix `create-fluixi` hanging after scaffolding in interactive mode.

  The app-mode select menu calls `emitKeypressEvents(stdin)`, which resumes stdin to
  read keypresses. After a choice was made the keypress listener was removed and raw
  mode reset, but stdin was left resumed — a live handle that keeps the event loop
  alive, so the CLI printed "Created …" and then never exited. Pause stdin when the
  menu finishes so the process exits cleanly. (Non-interactive `--spa`/`--ssr` runs
  were unaffected — they never open the keypress menu.)

## 0.1.0-next.2

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

- fdfa579: Fix the SSR template's `tsconfig.json`: it referenced `fluixi.config.mjs` and a
  non-existent `vite.config.ts` in `include` (the template ships `fluixi.config.ts`), and
  declared `types: ["node"]` without `@types/node` installed. The `include` now matches the
  scaffolded files and `@types/node` is added to devDependencies, so a fresh SSR app
  typechecks out of the box.

## 0.1.0-next.1

### Patch Changes

- eb95b6c: Docs: rewrite the package READMEs in the canonical format (logo, badges, overview,
  install, usage, license) and bring them up to date — streaming SSR, middleware, server
  functions, `fluixi generate`, and the SSR/SPA scaffold. Adds the missing `@fluixi/create`
  README. (The root README's package list + architecture were also corrected.)

## 0.1.0-next.0

### Minor Changes

- 6354c48: New `@fluixi/create` — scaffold a Fluixi app with `npm create @fluixi <dir>` (or
  `pnpm create @fluixi`). Prompts for a name and a mode — **SSR** (`@fluixi/start`: file
  routing + SSR + hydration) or **SPA** (`vite` + `@fluixi/vite-plugin`) — or take them on
  the CLI (`create-fluixi my-app --spa`). Replaces the broken `kettle-generate` templates.
