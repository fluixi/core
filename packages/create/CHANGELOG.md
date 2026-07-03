# @fluixi/create

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
