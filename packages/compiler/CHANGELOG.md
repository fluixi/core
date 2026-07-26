# @fluixi/compiler

## 1.0.0-alpha.60

## 1.0.0-alpha.59

## 1.0.0-alpha.58

## 1.0.0-alpha.57

## 1.0.0-alpha.56

### Minor Changes

- e183e9a: html`` templates: full feature support, and @fluixi/lit folded into @fluixi/dom.

  - `fluixi()` now compiles both JSX and html``by default (no`format` option).
  - Directives: if/else, each/key, bind:, class:, style: (+ class/style object
    syntax), ref, use/use:, html= raw, boolean/property bindings.
  - Events: native `on:click` plus modifiers (.capture/.once/.passive/.prevent/
    .stop/.self); `@click`/`onClick` stay delegated.
  - Components: dynamic `<${Comp}/>`, named slots (`slot="name"` → `props.name`),
    `<component is=${C}>` (→ Dynamic), and a new `Await` component.
  - `html`/`svg` markers and their types now live in @fluixi/dom and are
    re-exported from @fluixi/core; the separate `@fluixi/lit` package is removed.

- 4b911bc: JSX now supports the Solid-style directives `use:` and `oncapture:`, closing the gap
  with the html`` template surface.

  - `use:name` / `use:name={opts}` → normalized to a single `use` prop (`[dir, () => opts]`
    pairs) the runtime applies; the directive identifier is kept referenced so its import
    isn't dropped.
  - `oncapture:event={h}` → a native capture-phase listener.
  - `on:event` handlers pass through to the native-listener dispatch and are no longer wired
    reactively (a `props.onX` handler could previously be reactive-wrapped).
  - `use:${string}` / `oncapture:${string}` added to the JSX attribute types.

  Also fixes a latent bug in both lowerers: `use:x={{…}}` object options were parsed as an
  arrow block body (returning `undefined`) instead of an object — the accessor body is now
  parenthesized.

- e09bc16: Auto-import router components. Using `<Router>`, `<Outlet>`, `<Redirect>` or `<Link>` in a
  template (html`` or JSX) now injects the import from the router module if it isn't already
bound — the same ergonomics as control-flow components (`<Show>`/`<For>`/…). Configurable
via the `routerModule`option (default`@fluixi/core/router-next`). `Routes`isn't a
component (routing is`<Router routes={…}>`) and `lazy` is a function call rather than a
  tag, so those aren't auto-imported.

### Patch Changes

- 59ddb69: Drop the unused `tslib` dependency. `importHelpers` is on in tsconfig, but these packages ship esbuild-bundled output that inlines the TS helpers — nothing in the published code imports `tslib`, so it was dead weight in `dependencies`.
- 59ddb69: Compile lit `` html`...` `` templates through the shared JSX IR. A new `format: 'jsx' | 'lit' | 'both'` option (default `'jsx'`, unchanged) routes ` html` `/` svg` ` tagged templates through the same host-agnostic IR and imperative backend JSX uses — a template and its JSX twin emit byte-identical code, and there is no lit runtime in the output.

  The template front-end handles child/attribute/event/`.prop`/`?bool`/spread bindings, capitalized/member component tags (so `<Show>`/`<For>`/`<Ctx.Provider>` control flow works inside ` html` `), mixed static+hole attribute values, HTML comments, raw-text elements, and nested ` html` ` composition (`${cond ? html`…` : html`…`}`, `${list.map(x => html`<li>${x}</li>`)}`). A type-annotated arrow param inside a hole (`(x: T) => html`…``) now compiles (the reparse understands TypeScript). Removed the dead `litrx` runtime directive handler.

- Updated dependencies [e183e9a]
  - @fluixi/template-parser@0.1.0-alpha.1

## 1.0.0-alpha.55

### Patch Changes

- daa7af2: Update READMEs for public npm: drop the GitHub Packages `.npmrc` install instructions (no auth needed on public npm) and replace the GitHub Packages registry badge with an npm version badge.

## 1.0.0-alpha.54

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.

## 1.0.0-alpha.53

## 1.0.0-alpha.52

## 1.0.0-alpha.51

## 1.0.0-alpha.50

## 1.0.0-alpha.49

## 1.0.0-alpha.48

## 1.0.0-alpha.47

### Patch Changes

- 3ec6f21: Make lazy component props consistent and scope them to components. Every component prop is now emitted as a getter (`get prop() { return … }`) — including static props and the base object inside `mergeProps(...spreads, { … })` — so a component is created once and reactivity flows through the getter uniformly, across all codegen paths (inline jsx, inline imperative, IR). Native-element attributes are no longer getter-wrapped: they already carry their own reactivity as `() => expr` thunks that `spread` consumes, so wrapping them added a redundant `get x() { return () => expr }` layer.

## 1.0.0-alpha.46

### Patch Changes

- 8ff7815: Emit reactive component props as getters. `<Comp prop={sig()} />` compiled to `createMemo(() => createComponent(Comp, { prop: sig() }))`, reading the signal eagerly inside the memo — so the memo re-created the whole component on every change. A component rendering a `<Portal>` then re-mounted and piled up in `<body>`. Reactive props (`prop={sig()}`, `prop={store.x}`) are now emitted as getters (`get prop() { return sig() }`, like `children`), so the component is created once and reactivity flows through the getter into its own effects. Static props, plain identifiers and event handlers stay eager. Applies to both codegen paths (inline + IR).

## 1.0.0-alpha.45

### Patch Changes

- 536a75e: Emit reactive component props as getters. `<Comp prop={sig()} />` compiled to `createMemo(() => createComponent(Comp, { prop: sig() }))`, reading the signal eagerly inside the memo — so the memo re-created the whole component on every change. A component rendering a `<Portal>` then re-mounted and piled up in `<body>`. Reactive props (`prop={sig()}`, `prop={store.x}`) are now emitted as getters (`get prop() { return sig() }`, like `children`), so the component is created once and reactivity flows through the getter into its own effects. Static props, plain identifiers and event handlers stay eager. Applies to both codegen paths (inline + IR).

## 1.0.0-alpha.44

## 1.0.0-alpha.43

### Patch Changes

- 71d770c: Make control-flow reactive props reactive in the called shape. `<For each={items()}>`, `<Show when={cond()}>`, `<Index each={xs()}>` and `<Match when={m()}>` snapshot their value once and never updated — only the accessor shapes (`each={items}` / `each={() => items()}`) reacted. The compiler now emits these value props as getters (like `children`), and the runtime reads them through a shared `resolveReactiveProp` helper inside each component's own tracking scope, so all three shapes work and `<For>` keeps its keyed reconciliation instead of re-creating on every change. Both codegen paths (inline + IR) emit getters. `Dynamic.component` and `Portal.mount` are intentionally left as-is (a component is indistinguishable from an accessor; `mount` is read once).

## 1.0.0-alpha.42

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`

## 1.0.0-alpha.41

## 1.0.0-alpha.40

## 1.0.0-alpha.39

## 1.0.0-alpha.38

## 1.0.0-alpha.37

## 1.0.0-alpha.36

## 1.0.0-alpha.35

## 1.0.0-alpha.34

### Patch Changes

- 0c2ecb7: Fix whole-app hydration duplicating the tree (rendering it 2–3×) for nested Router/Suspense/Outlet apps — the shape every `@fluixi/start` app has.

  Inline JSX passed to a **component** prop (e.g. `<Suspense fallback={<div/>}>`) compiled to an eager IIFE built when the props object was constructed. During hydration that walked the hydration cursor, and a same-tag fallback `<div>` adopted the real server content node, stranding the cursor so the content rebuilt fresh next to the server DOM. Now:

  - Inline-JSX component props compile to **lazy getters** (like `children`) in both imperative codegens (inline + IR).
  - `@fluixi/dom` adds `runWithoutHydration`, and Suspense instantiates its fallback off the hydration cursor.
  - `startClient` **auto-hydrates a non-empty mount root** — reusing the server DOM instead of clearing and re-rendering, which removes the first-paint re-render flash. A client-only app (empty `#root`) still client-renders.

## 1.0.0-alpha.33

## 1.0.0-alpha.32

## 1.0.0-alpha.31

## 1.0.0-alpha.30

## 1.0.0-alpha.29

## 1.0.0-alpha.28

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

## 1.0.0-alpha.27

## 1.0.0-alpha.26

## 1.0.0-alpha.25

## 1.0.0-alpha.24

## 1.0.0-alpha.23

## 1.0.0-alpha.22

## 1.0.0-alpha.21

## 1.0.0-alpha.20

## 1.0.0-alpha.19

## 1.0.0-alpha.18

## 1.0.0-next.17

## 1.0.0-next.16

### Patch Changes

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

- f30d5e9: Server functions in lazy routes now register reliably. `serverFunctionsVitePlugin`
  provides `virtual:fluixi-server-fns` — side-effect imports of every module containing a
  `"use server"` directive (found by scanning `src/`). The server entry imports it, so all
  server functions register at startup, including those in lazy-loaded routes that would
  otherwise register only when their chunk loads (causing an RPC registry miss → 404). The
  client never imports the virtual module.

## 1.0.0-next.15

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

## 1.0.0-next.14

## 0.4.0-next.13

## 0.4.0-next.12

## 0.4.0-next.11

## 0.4.0-next.10

## 0.4.0-next.9

## 0.4.0-next.8

## 0.4.0-next.7

## 0.4.0-next.6

## 0.4.0-next.5

## 0.4.0-next.4

### Patch Changes

- 21d2c18: ---

  "@fluixi/kettlejs": patch

  ***

  Tidy kettlejs internals: remove the dead `dev-server/` and `builder/` stubs and
  ~4,500 lines of extensionless router scratch files (`actual`/`curr`/`known`/`lts`/
  `rs`/`rt`) — all unexported and unimportable. No public API change.

## 0.4.0-next.3

## 0.4.0-next.2

## 0.4.0-next.1

## 0.4.0-next.0

### Minor Changes

- 0769982: The **imperative** backend is now the **default** codegen (was `jsx`). Consumers
  using `fluixi()` / `createVitePlugin()` without an explicit `backend` now compile
  straight into `@fluixi/dom` runtime calls (createNativeElement/spread/insert/…)
  instead of the interpreted `jsx()`/`jsxs()` runtime. The `jsx` backend remains
  available via `backend: 'jsx'` (unchanged when opted in). Apps already on
  `backend: 'imperative'` are unaffected; the example configs drop the now-redundant
  opt-in.

### Patch Changes

- a6628d5: Fix the IR codegen to match inline: component prop _values_ are now passed as
  values, not `() => …` thunks. Wrapping them handed the component a function
  instead of the value — e.g. `history={createMemoryHistory()}` caused
  `history.get is not a function`, breaking the whole router example under the IR
  codegen. The createComponent call already sits in a createMemo, so reading a
  signal in a prop still re-evaluates on change. Both codegens now pass the full
  router example and a new differential fixture.
- f18b9d9: Fix the imperative `{props.children}` async bug: lazy/`<Suspense>` content threaded
  through a child component's `{props.children}` rendered empty. Two causes, both in
  the inline codegen:

  1. `.children` member access compiled to a reactive `() => props.children` thunk,
     which fully unwrapped the child's Suspense/memo to a static node and severed
     the reactive binding. It's now non-reactive, so `insert` binds the child's own
     memo (like a directly-rendered `<Outlet/>`).
  2. JSX whitespace between elements (e.g. `<Shell>\n  <Suspense/>\n</Shell>`) was
     kept as a `" "` text node, turning `props.children` into an array `[" ", memo,
" "]` — and an array insert doesn't reactively bind a memo/component inside it.
     Now uses canonical JSX whitespace cleaning (drops newline-spanning whitespace,
     as React/Solid do), so a lone child stays lone. The IR codegen path is kept in
     sync (identical output).

## 0.3.0

## 0.2.1

## 0.2.0

## 0.1.0

### Minor Changes

- 78dd576: KettleJS compiled fine-grained architecture.

  - New `@fluixi/compiler` package: host-agnostic JSX compiler with an IR and
    pluggable codegen backends. Babel is the front-end adapter; the JSX transform
    moved here (`@fluixi/babel-plugin-jsx` is now a thin re-export).
  - Imperative codegen backend — compiles JSX straight into `@fluixi/dom` runtime
    calls (`createNativeElement`/`spread`/`insert`/`createComponent`) instead of the
    `jsx()` automatic runtime. Selectable via the plugin/vite-plugin options
    `backend: 'jsx' | 'imperative'` and `codegen: 'inline' | 'ir'` (jsx stays the
    default). The `ir` path recurses into JSX nested in expressions.
  - New `@fluixi/lit` package: the lit renderer extracted out of `@fluixi/dom`, so
    the core runtime is usable without lit. The `@fluixi/dom` barrel is now lit-free.
  - New `@fluixi/vite-plugin`: the canonical Vite integration (`fluixi()`).
  - `@fluixi/jsx-runtime` now instantiates components through the framework's
    registered `createComponent` (unifying the jsx and imperative paths).
  - Runtime fixes surfaced by hardening: per-child reactive `insert` for multi-child
    elements, `Switch`/`Match` with compiler-wrapped children, and `classList` support.
