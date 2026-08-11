# @fluixi/dom

## 1.0.0-alpha.74

### Patch Changes

- 6fba3ed: Don't ship an empty `__FX_DATA__` script.

  A resource can resolve to something JSON cannot carry — most often a lazy route's
  module, where the resource value _is_ the component function. That entry passed
  the "is there any data?" check (it is a real entry in the map) and then vanished
  inside `JSON.stringify`, so the document carried
  `<script type="application/json" id="__FX_DATA__">{}</script>`: a data transport
  with nothing in it, on every page whose only resource was a lazy import.

  `serializeResourceData` now skips values JSON cannot represent, and decides
  whether to emit on the _serialized_ payload rather than on the map — so a nested
  `undefined`, or a class whose `toJSON` returns nothing, cannot resurrect the
  empty script either.

- bb5aea1: Fix resource ids shifting between the first request for a route and the next.

  A resource id is a position in a per-render sequence, and the client re-derives
  it by counting resources in the same order. `lazy()` broke that. Its module-load
  resource is created on the cold path only, and on the server the module stays
  loaded after the first request — so the first visitor after a restart got the
  page's own data under `r1` and everyone after them got `r0`, while the client,
  which preloads routes before hydrating, always counted from `r0`.

  One of the two had to be wrong. In practice the first visitor after every deploy
  was served data keyed to an id their client never looked up: the resource fell
  back to fetching on the client, so that visitor paid a request the page had
  already answered, and saw whatever the loading state renders.

  `ResourceOptions` gains `transport?: boolean`. `false` opts a resource out of the
  `__FX_DATA__` transport _and_ out of the id sequence — the two have to move
  together, since an id consumed on one side only shifts every id after it.
  `lazy()` uses it: the value there is the component function, which never
  travelled to the client anyway, and the client re-imports the chunk itself.

  Both `createResource` implementations take the option — the live one in
  `graph/resource.ts` and the legacy `@fluixi/reactive/signal-legacy` — so the two
  cannot disagree about what an id means.

- Updated dependencies [bb5aea1]
  - @fluixi/reactive@1.0.0-alpha.74

## 1.0.0-alpha.73

### Patch Changes

- 7e98158: Keep template-cloned elements when a hole receives an array

  `reconcileArrays` clones any node that already has a parent other than the target, so a
  module-hoisted static element is never stolen from its current owner. A DocumentFragment
  is not that kind of owner: `cloneTemplate` hands back the clone still inside its fragment,
  so every template-cloned element arrived with a non-null parent and was cloned again.
  `cloneNode` copies attributes but not event-handler properties, so the live DOM ended up
  holding handler-less copies while the wired-up nodes were discarded, unconnected.

  It took `templateClone` (for the fragment parent), `partialTemplates` (for the hole) and
  two siblings (so the hole received an array) — the default combination on the IR codegen.
  A single child takes a different insert path and always worked, which is why a component
  library hit this and the framework's own tests did not.

  With that fixed, `codegen` defaults to `'ir'` again.

  - @fluixi/reactive@1.0.0-alpha.73

## 1.0.0-alpha.72

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.72

## 1.0.0-alpha.71

### Patch Changes

- e46e9c0: Stamp the version attributes on every render path, not just core's

  `fluixi`/`fx-dom`/`fx-reactive` were stamped by `@fluixi/core`'s `render`, which an
  SSR app never calls: `startClient` hydrates through the DOM runtime's own `render`, so
  those apps — the docs site among them — carried no version attributes at all. Exactly
  the case where a bug report needs them.

  The stamping now lives in `@fluixi/dom`, which both paths pass through. `@fluixi/core`
  cannot be imported from there without a dependency cycle, so core registers its version
  on load instead and whichever render runs stamps what it has been given.

  - @fluixi/reactive@1.0.0-alpha.71

## 1.0.0-alpha.70

### Minor Changes

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

- 84b1821: Report the running package versions on the mount element and `window.Fluixi`

  The mount element now carries which build of each package is running:

  ```html
  <div
    id="app"
    fluixi="1.0.0-alpha.68"
    fx-dom="1.0.0-alpha.68"
    fx-reactive="1.0.0-alpha.68"
  ></div>
  ```

  and the same is available in the console:

  ```js
  window.Fluixi; // { core: '…', dom: '…', reactive: '…' }
  ```

  It replaces `fluixi-js="v1"`, which said only that Fluixi was involved.

  Three attributes rather than one because the packages are resolved separately even though
  they release together. A stale lockfile or a duplicated install can pair one version of the
  DOM runtime with another of the signal core, which surfaces as reactivity behaving
  inexplicably — so a mismatch also warns once at mount, naming the versions.

  `@fluixi/core`, `@fluixi/dom` and `@fluixi/reactive` each export `VERSION`.

### Patch Changes

- Updated dependencies [84b1821]
  - @fluixi/reactive@1.0.0-alpha.70

## 1.0.0-alpha.69

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.69

## 1.0.0-alpha.68

### Patch Changes

- 03acf33: Dispose a control-flow branch when it is left

  `Show`, `Switch` and `Dynamic` rendered their branches in the enclosing owner, so
  anything a branch registered with `onCleanup` — an event listener, an observer, a
  timer — was never torn down when that branch went away. It piled up on the outer
  scope and only ran when the whole tree died. In practice: a component inside a
  closed `<Show>` kept listening, and reopening left two live listeners, so an
  outside-click dismissal fired on clicks _inside_ the reopened panel.

  Each branch now renders in its own scope, disposed when the branch changes.
  Keyed on the branch, not on every re-run: these memos also re-run when a value
  changes within the same branch, and disposing then would throw away DOM the
  runtime deliberately reuses. `For` already disposed removed items correctly and
  is unchanged.

  `Match` now holds its `children` lazily, like `when`. Read eagerly, every
  branch's children were built the moment the `Match` node was — before `Switch`
  had chosen one — so they were created outside the branch's scope, and
  non-matching branches were built for nothing.

  `@fluixi/reactive` exports `createChildOwner` / `disposeScope` for this: a scope
  that is a child of the creation-time owner, so context still resolves up the
  chain, but whose cleanups can be torn down independently.

- 7f25a39: Make `selected`, `open` and `optgroup`/`option` `disabled` reactive

  These six were left as plain `boolean` while the rest of the toggle-state
  attributes were converted, so binding one — `<option selected={() => value() === v}>`,
  `<details open={() => expanded()}>` — failed to type-check even though the runtime
  applies a function-valued prop as a reactive render effect.

  Covers `details`/`dialog` `open`, `fieldset`/`optgroup`/`option` `disabled`, and
  `option` `selected`. `keygen` and `link` keep their non-reactive `disabled`: both
  are obsolete.

- Updated dependencies [03acf33]
  - @fluixi/reactive@1.0.0-alpha.68

## 1.0.0-alpha.67

### Minor Changes

- 09a321e: Add `ClientOnly` / `NoSsr`

  Renders children only in the browser, for subtrees that read `window`, a canvas,
  or produce time/locale-dependent output that would differ between the server and
  client passes and corrupt hydration.

  The swap to `children` is deferred to a microtask: `hydrate()` runs synchronously,
  so rendering them during the pass would desync the hydration cursor from the server
  markup — the exact bug the component exists to prevent. Outside hydration there is
  nothing to match, so children render immediately and `fallback` never appears.

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.67

## 1.0.0-alpha.66

### Patch Changes

- 8a53f68: Fix `ComponentChild` being `any`, which disabled type checking at every component boundary

  The union ended in `| any`, and a union containing `any` _is_ `any`. Every component
  return, every `children`, and every render prop's parameter was silently untyped —
  `<Pressable>{(state) => ...}</Pressable>` gave `state: any`.

  `FxElement` (`JSX.Element`) is now the same type rather than a parallel copy that had
  drifted, and an html`` `TemplateResult` is assignable to a renderable value. Build-time
  assertions keep both from regressing.

  Also: `createDynamicElement` infers what it builds — `'div'` → `HTMLDivElement`,
  `'circle'` → `SVGCircleElement`, a component → its own return type — instead of `any`.

  - @fluixi/reactive@1.0.0-alpha.66

## 1.0.0-alpha.65

### Minor Changes

- cdc5af9: Export `createDynamicElement` from `@fluixi/dom`.

  Building an element or component from a type known only at runtime is what a
  polymorphic `as` prop needs, and what JSX syntax cannot express — you can write
  `<div>` or `<Comp>`, but not `<{value}>`. That logic lived in the automatic JSX
  runtime only because JSX happened to be its first caller.

  It belongs in dom: both authoring modes compile to the same dom calls, so an
  `as`-polymorphic component shouldn't have to depend on `@fluixi/jsx`. It did —
  which made `@fluixi/jsx` a runtime dependency of every component library built on
  `as`, including for apps that only ever write html`` templates.

  `jsx()` now calls it rather than keeping its own copy, so the two paths can't
  drift the way `spread` and `applyProps` did.

### Patch Changes

- 0db63d9: Type the remaining attributes as `Reactive<>`.

  Thirteen attributes — including `id`, `title`, `href`, `src`, `disabled`,
  `checked` and `placeholder` — were written by hand as `T | Accessor<T>` while
  every other attribute uses `Reactive<T>`. The difference is that `Reactive<T>`
  permits `undefined`, which is how an attribute is omitted reactively:
  `() => (cond ? value : undefined)` removes it, because `setAttribute` already
  drops an attribute on `undefined`/`null`/`false`.

  So the most commonly bound attributes were the ones that couldn't be omitted
  without a cast — the same gap `style` had. Widening only accepts more, so nothing
  that compiled before stops compiling.

  `SVGAttributes` had the same split inside one interface: its presentation
  attributes were already `Reactive<>`, but the core `id`, `className`, `style`,
  `lang` beside them were not — so an SVG could animate its `fill` while being
  unable to compute its `id`. `style` there also had no accessor form at all.

  - @fluixi/reactive@1.0.0-alpha.65

## 1.0.0-alpha.64

### Patch Changes

- fb298c7: Type `style` as `Reactive<>`, like every other attribute.

  It was `string | CSSProperties | Accessor<string | CSSProperties>`, so an accessor
  could not return `undefined` — making `style` the one attribute that couldn't be
  omitted reactively. `setStyle` already removes it on `null`/`undefined`, so only
  the type disagreed.

  This blocks any component that forwards a computed style, since "no style" has to
  be expressible.

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

- Updated dependencies [d075630]
  - @fluixi/reactive@1.0.0-alpha.64

## 1.0.0-alpha.63

### Minor Changes

- 310b9d1: Move element attribute types to `@fluixi/dom`, exported as `@fluixi/dom/attributes`.

  `HTMLAttributes`, `AriaAttributes`, `DOMAttributes`, `CSSProperties`, the 45
  per-element interfaces and `SVGAttributes` describe the DOM, not JSX syntax, but
  they only existed inside `@fluixi/jsx`'s `JSX` namespace. The framework supports
  both JSX and html` authoring, so an html`-only app — and the html`` tooling
  itself — had to reach through a JSX package for types that have nothing to do
  with JSX.

  `@fluixi/jsx` re-exports every one of them into the `JSX` namespace, so
  `JSX.HTMLAttributes<T>` and friends keep working unchanged. `JSX.Element` and
  `JSX.IntrinsicElements` stay in `@fluixi/jsx` — those are the JSX contract.

### Patch Changes

- 9ac3eaa: Accept a reactive `style` in `applyProps`.

  `spread` wrapped a function-valued `style` in a render effect, but `applyProps`
  called `setStyle` with it directly, so the accessor was stringified once and
  never updated. `class` and `classList` on the same path already unwrapped an
  accessor, which is why this went unnoticed.

  `applyProps` is the path taken whenever a component forwards a computed value
  through a props object rather than as a compiled JSX attribute — every
  polymorphic/`as` wrapper does this — so a wrapper with a reactive style silently
  rendered its first value and froze.

  - @fluixi/reactive@1.0.0-alpha.63

## 1.0.0-alpha.62

### Patch Changes

- 2f99854: Fix accessor typeof checking to also identify reactive arrays using `isReactiveArray` on `insert()` so `accessor` could reach effect if it's potentially an array containg
  reactive values
  - @fluixi/reactive@1.0.0-alpha.62

## 1.0.0-alpha.61

### Patch Changes

- ee9da1c: Keep getter-backed props reactive when applied to native elements. `spread` and `applyProps` read each prop once (`const value = props[key]`) and only wired an effect when the value was a function. A component prop compiles to a getter — `get value() { return sig().toUpperCase() }` — whose current result is a plain value; forwarded to a native element through `{...rest}` (splitProps) or the jsx runtime, it was snapshotted once and never updated (the DOM only refreshed if you wrote `value={() => sig()...}` to make the value itself a function). Both paths now re-read `props[key]` inside a render effect for non-function values, so the getter's dependencies are tracked; function accessors keep their existing path (no double-wrapping) and static values run once. Covers the property/attribute path plus the `value`/`checked`/`select` special cases (focus guard and the select microtask defer preserved).
  - @fluixi/reactive@1.0.0-alpha.61

## 1.0.0-alpha.60

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.60

## 1.0.0-alpha.59

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.59

## 1.0.0-alpha.58

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.58

## 1.0.0-alpha.57

### Patch Changes

- Updated dependencies [5d92daa]
  - @fluixi/reactive@1.0.0-alpha.57

## 1.0.0-alpha.56

### Minor Changes

- 8b7f398: Forced binding directives `prop:`, `attr:` and `bool:` (Solid parity), on both JSX and
  html`` surfaces.

  - `prop:name` always assigns the DOM property (`element[name] = value`), bypassing the
    property-vs-attribute heuristic.
  - `attr:name` always sets the attribute via `setAttribute`.
  - `bool:name` toggles a boolean attribute by truthiness — a truthy value renders the empty
    string, a falsy value removes it.

  All three accept static or reactive values and are handled in the runtime `spread` /
  `applyProps` dispatch, so JSX (namespaced attribute) and html``(plain-attribute fallback)
both route through the same branches. Added`prop:${string}` / `attr:${string}`/`bool:${string}` to the JSX attribute types.

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

### Patch Changes

- 59ddb69: Remove the lit-html runtime bridge from the framework — no `lit` dependency remains anywhere. `@fluixi/core` no longer lazily `import('lit')` to register a lit renderer on the client (this was also the "Lit is in dev mode" console warning); `@fluixi/dom` drops `registerLitRender`/`renderLitToNodes` and the `_$litType$`/`_$litDirective$` insert-path branches; `@fluixi/dom` and `@fluixi/jsx` drop their remaining lit type imports (`TemplateResult`/`SVGTemplateResult`/`DirectiveResult`, which were redundant in the render-type unions). Authoring with ` html` `` templates now goes through the compiled path (`@fluixi/lit`+ the compiler's`format: 'lit'`), not a runtime renderer.
- 59ddb69: Drop the unused `tslib` dependency. `importHelpers` is on in tsconfig, but these packages ship esbuild-bundled output that inlines the TS helpers — nothing in the published code imports `tslib`, so it was dead weight in `dependencies`.
- 59ddb69: Fix empty reactive text duplicating on hydration. When a reactive text was empty on the client during hydration (e.g. a resource's brief loading state) while the server had rendered non-empty content there, `hydrateText('')` returned null and never adopted the server text node — so the content duplicated once the value resolved (e.g. `User #9User #9`).

  An empty reactive text now adopts and clears a non-empty server text node at the cursor. Client-only insertion anchors/placeholders (which must never consume a server node) are marked with a new `anchor` flag on `createTextNode` so they still bypass the hydration walker — keeping adjacent static text (e.g. a list item's text beside a nested element) intact.

- Updated dependencies [59ddb69]
  - @fluixi/reactive@1.0.0-alpha.56

## 1.0.0-alpha.55

### Patch Changes

- 5cfb7a6: Add a `description` field to packages that were missing one. Without it, npm's profile/list view fell back to the first README line — the raw `<p align="center">` logo block — instead of a summary.
- daa7af2: Update READMEs for public npm: drop the GitHub Packages `.npmrc` install instructions (no auth needed on public npm) and replace the GitHub Packages registry badge with an npm version badge.
- Updated dependencies [5cfb7a6]
- Updated dependencies [daa7af2]
  - @fluixi/reactive@1.0.0-alpha.55

## 1.0.0-alpha.54

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/reactive@1.0.0-alpha.54

## 1.0.0-alpha.53

### Patch Changes

- Updated dependencies [9b06063]
  - @fluixi/reactive@1.0.0-alpha.53

## 1.0.0-alpha.52

### Patch Changes

- 0eecc3c: Slim the client runtime: keep SSR code out of client bundles.

  The package barrel `export *`-ed the server string renderer (`renderToString`, serialization, request context) alongside the client runtime, so every client build shipped the SSR renderer. The runtime barrel now re-exports only the server node classes/guards it actually references; the renderer is re-exported as tree-shakeable named bindings from the entry (still importable as `import { renderToString } from '@fluixi/dom'`) and lives on the `@fluixi/dom/server` subpath. Added a `sideEffects` field so bundlers can drop what a client app doesn't use.

  Also removed dead code: the unused `ReactiveDOM` export/module and the unused `autoInitialize` export.

  - @fluixi/reactive@1.0.0-alpha.52

## 1.0.0-alpha.51

### Patch Changes

- 8d66341: Fix mapped-array children (`list.map(...)`) duplicating on hydration.

  DOM-reuse hydration walks the server DOM with a single descent cursor that only ascends back to an element's next sibling when the element is routed through `insert()` (`ascendPast`). `list.map(...)` builds all its elements back-to-back before any is inserted, so the first item adopted its server node and descended into it, but item 2+ then hydrated against the stranded cursor and built fresh — leaving the server copies behind (e.g. a sidebar's nav items or a grid's cards appearing twice after hydration).

  Hydration now keeps a descent stack (`hydration.parents`) and recovers the cursor: when it's exhausted at the current sibling level it ascends to an open parent's next sibling (and skips `insert()`'s empty-text anchors), so every mapped item adopts the server node in place instead of duplicating it.

  - @fluixi/reactive@1.0.0-alpha.51

## 1.0.0-alpha.50

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.50

## 1.0.0-alpha.49

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.49

## 1.0.0-alpha.48

### Minor Changes

- 7da8345: Add ref support to `PortalProps` and handle the ref on `Portal` `createRoot` method.
  So consumer components could bind ref to have the native `Portal` wrapper.
  Usefull when whant portal styling or wrappper DOM manipultaions.

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.48

## 1.0.0-alpha.47

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.47

## 1.0.0-alpha.46

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.46

## 1.0.0-alpha.45

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.45

## 1.0.0-alpha.44

### Patch Changes

- aa82713: Remove dropped `<For>` items whose child renders through a component boundary. When a `<For>` row wrapped its content in a context Provider around a component (`<P value={x}><Row/></P>`), the child resolved to a nested memo, so the array-insert reconciler tracked only a placeholder marker and inserted the real node beside it — outside reconcile tracking. Shrinking the list removed the marker but orphaned the node, leaving stale DOM. The per-slot reactive insert now removes its content when its effect is torn down, so a dropped row (or any reactive array member) is cleaned up. In-place updates (e.g. `<Show>` toggling) are unaffected — they don't re-run the enclosing effect.
  - @fluixi/reactive@1.0.0-alpha.44

## 1.0.0-alpha.43

### Patch Changes

- 71d770c: Make control-flow reactive props reactive in the called shape. `<For each={items()}>`, `<Show when={cond()}>`, `<Index each={xs()}>` and `<Match when={m()}>` snapshot their value once and never updated — only the accessor shapes (`each={items}` / `each={() => items()}`) reacted. The compiler now emits these value props as getters (like `children`), and the runtime reads them through a shared `resolveReactiveProp` helper inside each component's own tracking scope, so all three shapes work and `<For>` keeps its keyed reconciliation instead of re-creating on every change. Both codegen paths (inline + IR) emit getters. `Dynamic.component` and `Portal.mount` are intentionally left as-is (a component is indistinguishable from an accessor; `mount` is read once).
  - @fluixi/reactive@1.0.0-alpha.43

## 1.0.0-alpha.42

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
- Updated dependencies [3f0e665]
  - @fluixi/reactive@1.0.0-alpha.42

## 1.0.0-alpha.41

### Patch Changes

- Updated dependencies [82606b9]
  - @fluixi/reactive@1.0.0-alpha.41

## 1.0.0-alpha.40

### Patch Changes

- 853c4bb: Fire non-delegated `onX` event handlers. Handlers for non-bubbling events (`focus`, `blur`, `pointerenter`, `pointerleave`, `mouseenter`, `mouseleave`, `load`, `error`, …) were stored but never attached, so they silently dropped. `addDelegatedEventListener` now attaches a direct listener for those events (removed on cleanup), matching dom-expressions; delegated events (click/keydown/…) are unchanged.
  - @fluixi/reactive@1.0.0-alpha.40

## 1.0.0-alpha.39

### Patch Changes

- 0d139c4: Fix: a component whose entire return is a control-flow result (`<Show>`/`<Switch>`/`<For>`) now updates when its condition changes.

  When a component returned a bare control-flow memo and was placed among sibling children (an array), the array insertion read that memo **inline in the enclosing render effect**. A change then re-rendered the whole subtree from scratch (recreating sibling state) instead of re-inserting just that slot — so the output appeared frozen after the first render. An element or `Portal` wrapper worked because the wrapper's own `insert` gave the child its own effect.

  `flattenArray` now defers a reactive array member to a per-slot marker and wires a fine-grained `insert()` for it after the markers are placed, giving a bare control-flow component return the same nested render effect an element child gets. This does not affect the signal graph (sibling reactive attributes reading the same value already updated correctly).

  - @fluixi/reactive@1.0.0-alpha.39

## 1.0.0-alpha.38

### Patch Changes

- 30e6ecc: `setAttribute` now removes the attribute for `null`/`undefined`/`false` instead of rendering `="undefined"`.

  An `undefined`/`null` value fell through to `element.setAttribute(name, String(value))`, so a conditionally-absent attribute (`aria-orientation={cond ? 'vertical' : undefined}`, `data-pressed={dataAttr(false)}`) rendered as the literal string `"undefined"`. Since the compiler routes dynamic attributes through `setDynamicAttribute` → `setAttribute`, this hit any conditional attribute. Now, matching Solid's dom-expressions semantics: `null`/`undefined`/`false` remove the attribute, `true` sets it to the empty string, objects serialize to JSON, and everything else stringifies.

  - @fluixi/reactive@1.0.0-alpha.38

## 1.0.0-alpha.37

### Minor Changes

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

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.37

## 1.0.0-alpha.36

### Patch Changes

- 9b6215f: Fix an SVG attribute throw on hydration (and the dead reactivity it caused).

  `spread` decided property-vs-attribute from the compile-time `isSVG` flag, but the codegen only flags some SVG elements (`<svg>`, `<defs>`) and misses nested ones (`<linearGradient>`, `<stop>`). For a real SVG node a key like `x1` IS `in element` (a read-only `SVGAnimatedLength`), so it took the property branch and threw `Cannot set property x1 of SVGLinearGradientElement`. Because that throw happened mid-hydration, it aborted the synchronous hydration pass — so everything rendered after the offending SVG lost its reactivity (e.g. a filter whose `data-*` bindings never wired up).

  `spread` now detects SVG by the element's real `namespaceURI`, so SVG attributes always go through `setAttribute`. No throw, and downstream hydration/reactivity is unaffected.

  - @fluixi/reactive@1.0.0-alpha.36

## 1.0.0-alpha.35

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.35

## 1.0.0-alpha.34

### Patch Changes

- f0926b6: fix: support a static (non-function) `innerHTML` prop. The client handler always called the value
  as an accessor (`val()`), so a plain string like `innerHTML="<b>x</b>"` threw — and during
  hydration it wiped the element's content. It now sets a string directly and only wraps a function
  in an effect. `@fluixi/jsx` types `innerHTML` as `string | (() => string)` to match.
- 0c2ecb7: Fix whole-app hydration duplicating the tree (rendering it 2–3×) for nested Router/Suspense/Outlet apps — the shape every `@fluixi/start` app has.

  Inline JSX passed to a **component** prop (e.g. `<Suspense fallback={<div/>}>`) compiled to an eager IIFE built when the props object was constructed. During hydration that walked the hydration cursor, and a same-tag fallback `<div>` adopted the real server content node, stranding the cursor so the content rebuilt fresh next to the server DOM. Now:

  - Inline-JSX component props compile to **lazy getters** (like `children`) in both imperative codegens (inline + IR).
  - `@fluixi/dom` adds `runWithoutHydration`, and Suspense instantiates its fallback off the hydration cursor.
  - `startClient` **auto-hydrates a non-empty mount root** — reusing the server DOM instead of clearing and re-rendering, which removes the first-paint re-render flash. A client-only app (empty `#root`) still client-renders.
  - @fluixi/reactive@1.0.0-alpha.34

## 1.0.0-alpha.33

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.33

## 1.0.0-alpha.32

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.32

## 1.0.0-alpha.31

### Minor Changes

- 90ae430: Harden the SSR data transport (`__FX_DATA__`). The resolved resource/seed data is now emitted
  as a **non-executable `<script type="application/json" id="__FX_DATA__">`** block instead of an
  inline `<script>window.__FX_DATA__=…</script>` assignment. Two wins:

  - **CSP-friendly** — it works under a strict `script-src` that forbids inline executable scripts
    (the JSON block is data, not script).
  - **No script breakout** — the JSON is escaped with the standard SSR set (`<`, `>`, `&`,
    U+2028, U+2029, matching Next.js), so no string value can close the `<script>` or corrupt the
    parse. `JSON.parse` round-trips the escapes back.

  The client reads it through a single `getServerData()` helper (prefers a pre-set
  `globalThis.__FX_DATA__` for back-compat, else parses the JSON block) — used by hydration, i18n
  locale seeding, and isomorphic state. Confidentiality is still handled by `setDataRedactor`
  (strip server-only fields); the payload remains intentionally non-secret — don't put secrets in
  it, and don't rely on encoding it (encryption can't secure data you hand the client).

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.31

## 1.0.0-alpha.30

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.30

## 1.0.0-alpha.29

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.29

## 1.0.0-alpha.28

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.28

## 1.0.0-alpha.27

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.27

## 1.0.0-alpha.26

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.26

## 1.0.0-alpha.25

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

- @fluixi/reactive@1.0.0-alpha.25

## 1.0.0-alpha.24

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.24

## 1.0.0-alpha.23

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.23

## 1.0.0-alpha.22

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.22

## 1.0.0-alpha.21

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.21

## 1.0.0-alpha.20

### Minor Changes

- 8640cac: Add **isomorphic request state** — `createIsomorphicState` (`@fluixi/core`) + `preloadServerState` (`@fluixi/server`).

  A value resolved ONCE on the server per request (before the app renders), serialized into
  the page, and seeded synchronously on the client so the first client render matches the
  server — no hydration mismatch, no refetch. The generic, framework-level form of the
  "resolve some context (region / locale / session) before routes render, then transfer it"
  pattern that previously had to be done by hand (e.g. `await store.ensureInit()` in the
  server entry + per-page null-gating).

  ```ts
  // app code, runs on both sides
  const region = createIsomorphicState('region', {
    server: (event) => resolveRegion(event), // runs in the server preload, serialized
    client: () => readRegionCookie(), // optional pure-SPA initial value
    fallback: null,
  });
  region.value(); // reactive accessor — correct on the server AND at client hydration
  ```

  Wiring:

  - `@fluixi/dom`'s `renderToStringAsync` gains a `preload` option that runs inside the request
    context before the render.
  - `@fluixi/server`'s `renderRequestAsync` passes `preloadServerState`, which walks the
    registered states, runs each `server(event)` resolver, sets the signal, and stashes the
    value into the request data (it ships in `window.__FX_DATA__['__iso:<key>']`).

  NOTE: the state signal is currently module-scoped (shared across concurrent SSR requests) —
  fine for a single default value; per-user, per-request isolation via AsyncLocalStorage is a
  follow-up.

### Patch Changes

- Updated dependencies [3043097]
  - @fluixi/reactive@1.0.0-alpha.20

## 1.0.0-alpha.19

### Patch Changes

- Updated dependencies [e6ad857]
- Updated dependencies [f2e3b2a]
  - @fluixi/reactive@1.0.0-alpha.19

## 1.0.0-alpha.18

### Patch Changes

- 8f4c8cf: Slim the `@fluixi/dom` integration bridge to framework glue only.

  Reactive signal primitives are no longer wrapped by the integration bridge — they
  are imported straight from `@fluixi/reactive/signal` and unified across separately
  bundled packages via the graph's `globalThis` singleton. `dom/integration.ts` now
  carries only the non-core glue (`createComponent` + bridge/store plumbing).

  `@fluixi/dom` re-exports the reactive primitives from the core, so existing
  `import { … } from '@fluixi/dom'` consumers keep working unchanged. `@fluixi/core`
  (`context`, `router-next`, the reactive re-export barrel) now imports those
  primitives directly from `@fluixi/reactive/signal`.

- Updated dependencies [6ccf203]
  - @fluixi/reactive@1.0.0-alpha.18

## 1.0.0-next.17

### Minor Changes

- a1c29ec: Per-island resource seeding for partial hydration. Resources read inside an island are now
  seeded from `__FX_DATA__` per-island instead of relying on a whole-app hydrate: the server
  namespaces each island's resource ids in render order (`Counter#0:r0`, …) and the client
  reproduces that namespace when it hydrates the island, so island resources don't refetch or
  flash. Adds `RequestContext.nextIslandNamespace`/`withResourceScope` and a
  `hydrate(el, container, { resourceNamespace })` option. (Resources created in a data
  waterfall — after the first resolves during the async drain — fall outside the synchronous
  island scope and still refetch; pass that data via island `props`.)

### Patch Changes

- @fluixi/reactive@1.0.0-next.17

## 1.0.0-next.16

### Minor Changes

- ef9231f: `__FX_DATA__` redaction. Resource data resolved during SSR is serialized into the page
  (`window.__FX_DATA__`) so the client seeds resources without refetching — but it's
  visible to anyone viewing source. `setDataRedactor((value, id) => …)` transforms or drops
  each value before serialization: return the value to embed, or `undefined` to omit the
  entry (the client then refetches that resource). A throwing redactor omits rather than
  leaks. Exported from `@fluixi/dom` and `@fluixi/server`.

  ```ts
  import { setDataRedactor } from '@fluixi/server';
  setDataRedactor((v) => {
    if (v && typeof v === 'object' && 'passwordHash' in v) {
      const { passwordHash, ...safe } = v as any;
      return safe;
    }
    return v;
  });
  ```

- 3932e9d: Islands — partial hydration. `<Island component={C} props={p} name="C" />` server-renders
  a component inside a `<fluixi-island>` boundary (props serialized as a JSON attribute);
  `hydrateIslands(registry)` — the client entry instead of `startClient(App)` — finds every
  boundary, looks it up by name, and hydrates **only** that subtree in place. The rest of the
  page stays inert static HTML (no client JS executed for it). Re-exported from `@fluixi/core`.

  ```tsx
  // page (SSR): <Island name="Counter" component={Counter} props={{ start: 0 }} />
  // client entry:
  import { hydrateIslands } from '@fluixi/core';
  hydrateIslands({ Counter });
  ```

  (The `Index` SSR extra-node bug and dev hydration-mismatch warnings — also tracked under
  hydration follow-ups — were already resolved.)

- ea5c098: Lazy-route hydration + hydration correctness fixes.

  - **Lazy-route hydration** — a `lazy()` component loads async, after the synchronous
    hydration pass, so it used to render a fresh, duplicate subtree next to the un-hydrated
    server one. `lazy()` now captures its server-DOM position (`captureHydrationCursor`) and
    resumes hydration there when the module resolves (`runHydrationAt`), reusing the server
    DOM in place. `hydrate()` keeps resource seeding (`__FX_DATA__`) active after the sync
    pass so lazy-route resources still seed.
  - **Text-ordering fix** — an empty-text positioning marker (`createTextNode('')` from
    `insert`) was consuming and blanking the adjacent server content node during hydration,
    reversing siblings (`text <small>…` → `<small>…text`). Empty markers are client-only
    anchors and are now created fresh, never consuming a server node. (Fixes a general
    hydration-ordering bug, not just lazy.)
  - **`<Form>`/`<Link>` read `children` once** — the compiler's `children` getter builds
    fresh nodes on every access, so reading it twice produced duplicate nodes.

  New `@fluixi/dom` exports: `captureHydrationCursor`, `runHydrationAt`. Auto-hydration of
  SSR'd apps stays opt-in pending a remaining component-children duplication.

### Patch Changes

- ea5c098: Fix hydration duplicating native children that follow a void element when passed
  through a component. `hydrateElement` descended into a void element's (null)
  `firstChild`, stranding the cursor so the next sibling — e.g. the `<button>` after
  an `<input>` in `<Form><input/><button/></Form>` — was rebuilt fresh and appended.
  Void elements (`input`, `br`, `img`, …) now ascend to `nextSibling` instead of
  descending. This was the last bug gating default auto-hydration of SSR'd apps.
  - @fluixi/reactive@1.0.0-next.16

## 1.0.0-next.15

### Patch Changes

- @fluixi/reactive@1.0.0-next.15

## 1.0.0-next.14

### Patch Changes

- @fluixi/reactive@1.0.0-next.14

## 0.4.0-next.13

### Minor Changes

- 2b6fcd3: Keep lit fully out of the core module graph — fixes `HTMLElement is not defined`
  when SSR-rendering / prod-serving an app (e.g. via `@fluixi/start`).

  The real culprit was the file-routing codegen: `kettleRoutesPlugin` emitted
  `import { lazy, runWithOwner } from '@fluixi/kettlejs/router'` (the old, lit-coupled
  router) into `virtual:kettle-routes`. That statically pulled `@fluixi/lit` → `lit`,
  which `extends HTMLElement` at module init, so the server bundle threw on import —
  and because lit was static in the graph, the lazy `import('lit')` elsewhere couldn't
  be split out either. Codegen now imports `lazy` from `router-next` (lit-free); the
  unused `runWithOwner` is dropped.

  Also scrubbed the remaining lit pulls from the core entries so lit lives **only** in
  `@fluixi/lit`:

  - `@fluixi/kettlejs` main entry + `lib/index` barrel: removed the `html`/`svg`/
    `nothing`/`litRender`/`LitElement`/`$show`/`$for`/`$switch`/`$portal`/`$if`/`$each`/
    `$classMap`/`$styleMap`/`litrx`/`createReactiveJSX` re-exports; `Router`/`Link`/etc.
    now come from `router-next`; `render/index` lazily imports lit client-only.
  - `@fluixi/jsx-runtime`: dropped the `$`/`$if`/`litrx` re-export and the unused
    `html`/`svg`/`nothing` value imports (→ `import type`); removed the dead
    `@fluixi/lit` + `@lit-labs/ssr` dependencies.
  - `@fluixi/dom`: `TemplateResult` is now a type-only import.

  BREAKING: import lit symbols (`html`, `svg`, `nothing`, `LitElement`, `$show`/`$for`/
  `$switch`/`$portal`/`$if`/`$each`, `$classMap`/`$styleMap`, `litrx`) from `@fluixi/lit`
  directly instead of from `@fluixi/kettlejs`.

### Patch Changes

- @fluixi/reactive@0.4.0-next.13

## 0.4.0-next.12

### Patch Changes

- @fluixi/reactive@0.4.0-next.12

## 0.4.0-next.11

### Patch Changes

- @fluixi/reactive@0.4.0-next.11

## 0.4.0-next.10

### Patch Changes

- 92bf164: Dev hydration-mismatch detection now also covers comment markers: `hydrateMarker` warns (dev only) when the server marker at the cursor diverges from what the client expects, matching the existing element/text warnings. Helps diagnose structural SSR/CSR divergence.
- 92bf164: Async SSR: run the probe/final `serializeNode` inside the render root's owner. Previously these ran after `createRoot` returned (with `Owner` reset to null), so any resource a lazy subtree created _during_ serialization was unowned — `dispose()` couldn't cancel it, and it would settle after the response was serialized and the root disposed, re-running an effect on a torn-down tree (the "page renders, then errors ~2-3s later" crash with a slow backend). Running serialize within the root owner makes those resources owned, so they're cancelled on dispose.
  - @fluixi/reactive@0.4.0-next.10

## 0.4.0-next.9

### Patch Changes

- @fluixi/reactive@0.4.0-next.9

## 0.4.0-next.8

### Patch Changes

- @fluixi/reactive@0.4.0-next.8

## 0.4.0-next.7

### Patch Changes

- 59aa5a9: Fix an infinite render loop on the client after hydration (regression in 0.4.0-next.6). The eager stale-effect scheduling added for `<Suspense>` async SSR is now gated to the server render only (`setEagerStaleEffects`, enabled inside `renderToStringAsync`). On the client the lazy stale-effect behavior is restored, so a memo↔effect cycle no longer spins forever.
- Updated dependencies [59aa5a9]
  - @fluixi/reactive@0.4.0-next.7

## 0.4.0-next.6

### Patch Changes

- 901c975: Fix async SSR of lazy routes rendered through the router `<Outlet/>`. `propagateDirty` now schedules a stale effect reached via a pure memo on signal write (matching the memo-recompute path), so a `<Suspense>` output re-renders when its boundary resolves; and `renderToStringAsync` probe-evaluates the lazily-built tree before draining so deferred route resources register and are awaited instead of serialising the fallback.
- Updated dependencies [901c975]
  - @fluixi/reactive@0.4.0-next.6

## 0.4.0-next.5

### Patch Changes

- @fluixi/reactive@0.4.0-next.5

## 0.4.0-next.4

### Patch Changes

- 21d2c18: ---

  "@fluixi/kettlejs": patch

  ***

  Tidy kettlejs internals: remove the dead `dev-server/` and `builder/` stubs and
  ~4,500 lines of extensionless router scratch files (`actual`/`curr`/`known`/`lts`/
  `rs`/`rt`) — all unexported and unimportable. No public API change.

- Updated dependencies [21d2c18]
  - @fluixi/reactive@0.4.0-next.4

## 0.4.0-next.3

### Patch Changes

- @fluixi/reactive@0.4.0-next.3

## 0.4.0-next.2

### Minor Changes

- 97cc220: Add the keyed list-reconciliation primitives `mapArray`, `keyArray` and
  `indexArray` (mirrors SolidJS) and rebuild `<For>`/`<Index>` on top of them.

  - `mapArray(list, mapFn, { fallback? })` — reference-keyed; reuses an item's
    scope while the same value stays in the list, map fn gets the plain value + a
    reactive index. Backs `<For>`.
  - `keyArray(list, keyFn, mapFn, { fallback? })` — key-function keyed; survives
    object recreation, map fn gets a live item accessor. Backs `<For by={…}>`.
  - `indexArray(list, mapFn, { fallback? })` — index-keyed; growing adds slots,
    shrinking disposes trailing slots, a value change updates the slot signal
    without re-running the map fn. Backs `<Index>`.

  Each mapped item lives in its own `createRoot`, so list items have a stable,
  disposable owner scope. `<For>`/`<Index>` are now thin wrappers over these
  (and a stray debug `console.log` in the keyed `<For>` path is gone). Exported
  from `@fluixi/reactive/signal` and re-exported from `@fluixi/dom`.

### Patch Changes

- Updated dependencies [97cc220]
  - @fluixi/reactive@0.4.0-next.2

## 0.4.0-next.1

### Patch Changes

- @fluixi/reactive@0.4.0-next.1

## 0.4.0-next.0

### Minor Changes

- 80aded7: True DOM-reuse hydration. `hydrate()` now reuses the server-rendered DOM instead
  of re-rendering: the hydration cursor descends into a matched element's children
  (`createNativeElement`) and ascends past a placed child once its subtree is done
  (`insert`), matching the depth-first shape the imperative codegen emits.
  `insertExpression` adopts server nodes already in place. All changes are behind
  `isHydrating`, so the normal client render path is unchanged.
- 9effed1: Resource-data transport for hydration (no flash). `renderToStringAsync` now
  serializes resolved `createResource` values into an inline
  `<script>window.__FX_DATA__=…</script>`; on the client `hydrate()` seeds the
  matching resources (ids matched by creation order) so they don't refetch — the
  async data renders immediately instead of flashing through the loading fallback.
  Also extracts the DOM-reuse hydration out of `runtime.ts` into a dedicated
  `hydration.ts`.

### Patch Changes

- 7395dc9: Hydration now works for `For` (and `Show`) control-flow. Hydrating a server-
  rendered list used to add duplicate/extra nodes and break reconciliation: each
  `For` item's `createNativeElement` descended into its node, but nothing ascended
  the hydration cursor between siblings, so items 2+ were rebuilt fresh. `For` now
  advances the cursor past each rendered item (`hydrateAdvancePast`, no-op outside
  hydration), so server list items are reused and stay reactive. `Show` already
  worked; both are covered by tests. (`Index` SSR has a separate, pre-existing
  extra-node bug — tracked separately.)
- 7a2cdcd: Hydration now works for `Index` too (same fix as `For` in the previous release):
  each item ascends the hydration cursor past its rendered node so server list
  items are reused instead of rebuilt. `Index` SSR was already correct — this was a
  missing-ascend hydration bug, not a server-render one.
- a46d4cf: Dev-only hydration mismatch detection. When `hydrate()` walks the server DOM and
  the cursor node diverges from what the client builds (different tag/type), it logs
  a warning pointing at the likely cause (non-deterministic render, browser-only
  branches, untransported data). Tree-shaken out of production via
  `process.env.NODE_ENV`, so it costs nothing in prod. Only warns on a present-but-
  wrong node; empty-text insertion markers (which the server serializes to nothing)
  are not flagged.
- Updated dependencies [fd33c30]
- Updated dependencies [9effed1]
  - @fluixi/reactive@0.4.0-next.0

## 0.3.0

### Minor Changes

- 24388bb: Universal SSR + request scoping.

  SSR previously never worked (the runtime hard-required `document`). `@fluixi/dom`
  now has a universal string renderer: under server mode the leaf factories build a
  serializable `ServerNode` tree that `renderToString` turns into HTML — the same
  imperative runtime (insert/spread/Show/For/createComponent), no jsdom. The client
  path is unchanged (the `isServer` branch + duck-typed node guards).

  - `renderToString` / `renderToStringAsync` — sync render-once and async (awaits
    `createResource`/Suspense data before serializing, via an injectable resource
    tracker in `@fluixi/reactive`).
  - Request scoping (the module-global SSR concurrency hazard): a pluggable
    `RequestStore` shaped like `AsyncLocalStorage` — `runWithRequestContext`,
    `getRequestEvent`, per-request `routeData`/`nextId`. `@fluixi/dom` never imports
    `node:async_hooks`, so browser bundles stay clean.
  - New **`@fluixi/server`** package: the Node-side home that injects a real
    `AsyncLocalStorage` (concurrency-safe out of the box) and adds
    `renderRequest`/`renderRequestAsync`/`startServer`/`createHtmlDocument`.
  - `@fluixi/kettlejs` SSR now renders through `@fluixi/server`.
  - `splitProps` added to `@fluixi/dom` (reactive-preserving, Solid-style).
  - Resource `saveToCache` no longer throws when `localStorage` is absent (SSR).

### Patch Changes

- @fluixi/reactive@0.3.0

## 0.2.1

### Patch Changes

- @fluixi/reactive@0.2.1

## 0.2.0

### Patch Changes

- @fluixi/reactive@0.2.0

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

### Patch Changes

- @fluixi/reactive@0.1.0

## 0.0.1

### Patch Changes

- @fluixi/reactive@0.0.1
