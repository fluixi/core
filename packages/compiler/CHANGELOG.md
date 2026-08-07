# @fluixi/compiler

## 1.0.0-alpha.72

### Patch Changes

- 15f7c3c: Stop thunking `ref` on the IR codegen path

  `ref={mergeRefs(a, b)}` is a call expression, which the IR path read as a reactive value
  and wrapped: `ref: () => mergeRefs(a, b)`. The runtime calls `ref(element)`, so it called
  the thunk instead — the real callback never received the element, and everything hanging
  off that reference stopped working with nothing reported.

  This only surfaced once `codegen: 'ir'` became the default in `1.0.0-alpha.71`; a
  component library using a call-expression ref loses press state, forwarded refs and
  activation handlers on that release. Upgrade past it, or set `codegen: 'inline'`.

## 1.0.0-alpha.71

### Minor Changes

- ef528ba: Generate the ambient declarations for resolved components

  `resolve` lets a capitalised tag skip its import, but TypeScript still reported
  `Cannot find name` for every one of them — the import only exists after compilation.
  The answer was a hand-written `.d.ts` per project, or a CLI shipped by whichever
  component library you happened to use.

  The compiler now generates it. `componentGlobals(rules)` turns a resolve config into
  declarations, and the Vite plugin writes them to `src/fluixi.d.ts` on config resolve.
  Set `globals` to another path, or `false` to turn it off. Commit the file — that is what
  lets a fresh clone type-check before anyone starts the dev server.

  The generator belongs here rather than in a component library because only the resolve
  config knows the whole picture: library components, the project's own, and the builtins
  all arrive through it.

  The file goes to `fluixi.d.ts` at the project root, which needs `"fluixi.d.ts"` in the
  tsconfig `include` alongside `"src"`. If it is written somewhere TypeScript will not
  read it, the plugin says so — an ignored file and a missing one produce identical
  errors, so that is not a difference worth leaving anyone to work out.

- 12ea3a5: Run `use:` directives in JSX, and make IR the default codegen

  `<div use:tooltip={opts} />` in JSX compiled to a prop literally named `use:tooltip`,
  which the runtime does not dispatch on — so the directive never ran, and nothing said so.
  It worked in ` html` ``and under`codegen: 'ir'`, which is what made it look like it
worked at all. The inline path now normalises it the same way, into the single `use` prop
  the runtime reads.

  `codegen` now defaults to `'ir'`. Both paths produce the same behaviour, but the IR path
  is the one the newer work is built on — template cloning, partial templates, resolution
  and load strategies — so it is what most output already goes through. Set
  `codegen: 'inline'` to keep the old path.

## 1.0.0-alpha.70

### Minor Changes

- d27056f: Publish the built-in component names as data

  `@fluixi/compiler/builtins` exports the names the compiler supplies without an import,
  and the module each comes from:

  ```ts
  import {
    builtinComponentMap,
    RESERVED_COMPONENTS,
  } from '@fluixi/compiler/builtins';
  ```

  These were hardcoded inside the Babel plugin, which mixed up two things: which module a
  name comes from — data every tool needs — and which names get special codegen, which is
  the compiler's business. With nothing published, `@fluixi/ts-plugin` kept its own copy.
  That copy is gone, and the subpath carries no compiler code, so the plugin's bundle grows
  2 KB rather than pulling the compiler in.

  **A configured `resolve` rule now wins over `Router`, `Outlet`, `Redirect` and `Link`.**
  Those are only an auto-import, so a project defining its own `Link` previously lost to the
  router's silently, rendering the wrong component with nothing reported.

  Control flow is unchanged and still outranks rules, because there the name selects codegen
  a rule cannot supply: `Show`, `For`, `Index` and `Match` emit their value prop as a getter,
  so `each={items()}` re-reads instead of snapshotting once. `RESERVED_COMPONENTS` lists them
  so rule generators can report a clash instead of emitting a rule that does nothing.

- 509f3f2: Record where each component reference comes from in the IR

  `IRComponent` gains `source` — `{ module, export, origin }` — set by a resolve pass that
  runs between the frontends and codegen:

  ```ts
  import { resolveComponentSources } from '@fluixi/compiler';

  const { resolved, unresolved } = resolveComponentSources(ir, {
    resolver,
    isBound,
  });
  ```

  `origin` separates `rule` from `builtin` because they are not interchangeable: a rule is
  configuration and can be re-targeted, while a control-flow name also selects a lowering
  and cannot. Precedence is encoded once, so import injection and later passes read one
  answer instead of agreeing by coincidence.

  `unresolved` lists capitalised tags nothing supplies and nothing binds. Those compile to a
  reference to an identifier that does not exist — the build succeeds and the page throws —
  so reporting them is the point of the pass having a return value.

  Emitted output is unchanged.

- 4f4895a: Add the `load:` directive — decide when a component's code is fetched

  Resolution says _where_ a component comes from; `load:` says _when_ it loads. They are
  separate because they vary independently: a component's location is the same everywhere
  and belongs in config, while whether a particular usage should wait for the viewport is
  a property of that usage.

  ```tsx
  <Summary />                                    // eager — entry chunk
  <ExportDialog load:interaction />              // own chunk, on first interaction
  <AuditLog load:media="(min-width: 1024px)" />  // own chunk, desktop only
  <RevenueChart load:visible="200px" />          // own chunk, on approach
  ```

  Six strategies: `eager`, `idle`, `visible`, `interaction`, `media`, `never`. A deferred
  component compiles to `deferred(() => import('…'), { strategy })` instead of a static
  import, so chunking, hashing and tree-shaking stay ordinary bundler behaviour rather
  than an integration. `deferred()` is new in `@fluixi/core`, built on `lazy()` — it adds
  only the scheduling, reusing Suspense integration and the synchronous-when-preloaded
  hydration path unchanged.

  `load:` joins the existing `use:`/`prop:`/`attr:`/`bool:` namespace, so it cannot
  collide with a real prop. Both syntaxes share one parser: `load:visible` is already a
  valid `JSXNamespacedName`, and the html``parser gains a`LoadDirective` node, but each
  funnels through the same helper — a test pins the two to identical output.

  **Strategy collapsing is included, and it is not optional.** If a module is referenced
  eagerly anywhere in the file, deferred references to it are demoted to eager: it is in
  the chunk already, so a lazy boundary would add a wrapper, a promise and a re-render in
  order to fetch nothing — and emitting both forms would redeclare the binding.

  The strategy must be a literal. It decides how the module is emitted, so a runtime value
  cannot supply it, and `load:visible={margin}` is an error rather than a silent fallback.

  See `examples/load-strategies`, whose test runs the real build and asserts which chunk
  each component landed in.

- 2a317dc: Build markup by cloning a template instead of an element at a time

  Static markup is serialized to HTML once, declared at module scope, and cloned per
  instance. Subtrees whose structure is static but which contain dynamic values are cloned
  too, with each value inserted through a reference into the clone:

  ```js
  const _tmpl$0 =
    '<div class="card"><h3><!--fx--><!--fx/--></h3><p>a <!--fx--><!--fx/--> b</p></div>';
  const _el$ = templateNode(_tmpl$0, 'div', true);
  const _n$1 = _el$.firstChild.firstChild;
  const _n$2 = holeEnd(_n$1);
  insert(
    _el$.firstChild,
    holeScope(_n$1, () => () => title()),
    _n$2,
    holeContent(_n$1, _n$2)
  );
  ```

  Instantiation is roughly twice as fast — 2.08x for a three-element row, 2.45x for a
  nine-element card, measured in Chrome against the real runtime. The gap widens with
  component size. Transfer size is unchanged: the old output was repetitive enough that
  compression absorbed it, so this is a parse-time and runtime win rather than a bytes one.

  Applies to `html\`\``and`codegen: 'ir'`, and is on by default. `templateClone: false`and`partialTemplates: false` opt out.

  **Each interpolation leaves an `<!--fx-->` … `<!--fx/-->` pair in the HTML.** That is what
  makes a clone, the server's markup and the DOM being hydrated the same shape, so one set
  of node references addresses all three and hydration adopts the server's nodes rather than
  rebuilding them. Tests asserting exact server markup will need to account for them.

  New in `@fluixi/dom`: `templateNode`, `holeEnd`, `holeContent`, `holeScope`, and a server
  parser that turns a template into server nodes so SSR can render into it.

  Some shapes stay on the element-by-element path, because a template would change what the
  code means: SVG, namespaced names (`prop:`, `attr:`, `bool:`, `on:`), property-only names
  (`innerHTML`, `value`, …), raw-text elements (`<style>`, `<script>`), and adjacent text
  children, which the DOM merges while the IR does not.

### Patch Changes

- 77ab4cb: Fix control flow not being imported when nested

  `<div><Show/></div>` compiled to a reference to an undefined `Show`. The JSX visitor
  registers control-flow names, but a lowered parent is replaced before its subtree is
  walked, so a nested tag never reached it. Registration moved to `emitComponentCall`, the
  chokepoint every component passes through.

  Only unbound names are injected, so a hand-written import still wins, and repeated usage
  emits one binding.

- b8ef7fc: Fix `codegen: 'ir'` skipping resolution, and drop a dead import

  Under `codegen: 'ir'` a resolved tag compiled to a bare reference with no import and threw
  at runtime — the IR path never ran the resolve pass. It now runs the same passes as the
  `html\`\``path.`load:`was also read as an ordinary attribute there, so the directive
reached the props object as`get "load:visible"()`.

  The IR path also emitted `import { jsx, jsxs, Fragment } from '@fluixi/jsx'` into every
  file, which it never uses. `backend: 'jsx'` is unaffected.

- 569fe05: Fix a named slot duplicating a same-named attribute

  `<Card header><span slot="header">…</span></Card>` emitted the `header` key twice — valid
  JS where the last wins, but the first is dead and esbuild warns on every build. A slot now
  replaces a same-named attribute: content is the more specific intent.

- b820700: Write literal attributes directly instead of through `spread`

  An element with only compile-time-constant attributes emitted
  `spread({ element, props: { className: "card" } })`. `spread` walks every prop checking for
  reactivity, events, refs, class/style objects and namespaces — none of which a constant
  needs. It now emits `el.setAttribute("class", "card")`.

  This covers elements that cannot be cloned whole because a child is dynamic, which is the
  common shape. Fully static subtrees already bake their attributes into the template. SVG
  stays on `spread`, where the namespace handling lives.

- Updated dependencies [4f4895a]
  - @fluixi/template-parser@0.1.0-alpha.3

## 1.0.0-alpha.69

### Minor Changes

- d7bf256: Resolve unbound component tags to modules, so a component can be used without an import

  The framework already auto-imported `Suspense`/`Portal`/`Router`, but through a
  hardcoded name set inside the Babel plugin — not extensible by a UI library or an
  app. `resolve` makes that configurable:

  ```ts
  // vite.config.ts — forwarded through the vite/rollup integration
  fluixi({
    resolve: [
      { components: { Button: '@fluixi-ui/button' } },
      { match: /^Icon(.+)$/, module: '@/icons/$1', export: 'default' },
    ],
  });
  ```

  `html`<Button>Save</Button>``and`<Button>Save</Button>` then compile identically
  with no import written by hand. Resolution is by _name_, below the syntax layer, so
  parity between the two syntaxes is structural rather than maintained by hand.

  - A lexical binding always wins — an explicit import or a local of the same name is
    never overridden, so enabling this cannot change what an existing file means.
  - Components from one module share a single injected import.
  - A name claimed by two rules with different targets is reported as a conflict rather
    than resolved first-rule-wins: with a map of ~80 common words (`Card`, `Table`,
    `Text`), a working import of the _wrong_ component is far harder to debug than an
    error.
  - With no `resolve` rules, behaviour is exactly as before.

  `createComponentResolver` is exported so the TS plugin can synthesise the same import
  for hover/go-to-definition/rename, and a codemod can materialise imports back into
  source. Keeping resolution a pure `name -> { module, export }` function is what lets
  those consumers agree.

  Also forwarded through the vite and rollup integrations: `getOptions()` is an
  allowlist, so an option missing from it is silently dropped rather than rejected.

## 1.0.0-alpha.68

## 1.0.0-alpha.67

## 1.0.0-alpha.66

## 1.0.0-alpha.65

## 1.0.0-alpha.64

### Patch Changes

- ed14cd1: Map compiled html`` back to the template.

  The IR is emitted as a string and reparsed, so the resulting nodes carry no
  position. Babel then falls back to the enclosing node's, collapsing everything
  lowered from a template onto a single point — a breakpoint or stack frame inside
  compiled template code landed at the top of the enclosing function rather than at
  the template.

  Generated nodes now inherit the template's own location, so template-derived code
  maps into the template's span.

  This is coarse by construction: everything from one template maps to that
  template, not to the individual hole it came from. Per-hole precision would mean
  carrying spans through the emit, which the string round-trip discards — a larger
  change to the backend.

- 13d488e: Auto-import `<SuspenseList>`, and make a reactive `class` a render effect.

  `SuspenseList` was listed in the compiler's core-only control-flow set but never
  in the set that drives auto-import, so the core-only entry was dead and
  `<SuspenseList>` in a template failed to compile unless imported by hand — while
  `Suspense` and `Await`, which sit beside it in core, worked. Surfaced by building
  the language-service map against these sets.

  `setClassName` wrapped a function-valued class in `createEffect`, whereas `spread`
  already wraps class in `createRenderEffect` and every other attribute binding uses
  a render effect. A class forwarded through `applyProps` — which is what every
  polymorphic wrapper does — was therefore scheduled a phase later than the same
  binding written as a compiled attribute. Also removes a commented-out
  `console.log` and a dead alternative implementation left in that function.

- Updated dependencies [4b5e5fb]
  - @fluixi/template-parser@0.1.0-alpha.2

## 1.0.0-alpha.63

## 1.0.0-alpha.62

## 1.0.0-alpha.61

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
