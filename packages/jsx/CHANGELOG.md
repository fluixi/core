# @fluixi/jsx-runtime

## 1.0.0-alpha.89

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.89
- @fluixi/dom@1.0.0-alpha.89

## 1.0.0-alpha.88

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.88
- @fluixi/dom@1.0.0-alpha.88

## 1.0.0-alpha.87

### Minor Changes

- aafffb1: A custom element can be typed for its consumers. `ElementOf` builds the DOM interface for `HTMLElementTagNameMap`, so `querySelector` returns something with the element's properties on it; `ElementAttributes` builds the JSX tag's attributes from the same prop schema, with a handler per dispatched event; `ForeignElementAttributes` does the same for an element someone else wrote. JSX augmentation moves to an interface named `HTMLReactiveElement`, and the previous `FluixiElements` keeps working.

  The web-component vocabulary is available alongside the framework's own: `customElement`, `property`, `attribute`, `event`, `target`, `ref` and `slot` bind to `defineElement`, `prop`, `createDispatch` and `createTargets`.

### Patch Changes

- Updated dependencies [807fb8a]
- Updated dependencies [9dc9e3c]
  - @fluixi/dom@1.0.0-alpha.87
  - @fluixi/reactive@1.0.0-alpha.87

## 1.0.0-alpha.86

### Patch Changes

- Updated dependencies [5b18653]
  - @fluixi/reactive@1.0.0-alpha.86
  - @fluixi/dom@1.0.0-alpha.86

## 1.0.0-alpha.85

### Patch Changes

- Updated dependencies [ea498ef]
  - @fluixi/reactive@1.0.0-alpha.85
  - @fluixi/dom@1.0.0-alpha.85

## 1.0.0-alpha.84

### Patch Changes

- 9565405: The published entry files now include a copyright banner, and `@fluixi/dom`, `@fluixi/jsx`, `@fluixi/template-parser` and `@fluixi/template-runtime` ship unminified, which their build configs had always asked for.
- Updated dependencies [9565405]
- Updated dependencies [76e286a]
- Updated dependencies [c3d5026]
- Updated dependencies [c3d5026]
- Updated dependencies [4bd2bf1]
  - @fluixi/dom@1.0.0-alpha.84
  - @fluixi/reactive@1.0.0-alpha.84

## 1.0.0-alpha.83

### Patch Changes

- 51433c3: The global JSX namespace now declares each name once, and JSX.IntrinsicElements correctly carries the element types, with JSX.Element being an alias for what the DOM can insert. Before this, `<div>` was "Property 'div' does not exist" in every application, and no editor could complete an element or an attribute.
- Updated dependencies [f5b4031]
- Updated dependencies [e005759]
- Updated dependencies [f1d153c]
- Updated dependencies [ae9784f]
- Updated dependencies [f1d153c]
- Updated dependencies [f5b4031]
- Updated dependencies [5f6a72f]
  - @fluixi/reactive@1.0.0-alpha.83
  - @fluixi/dom@1.0.0-alpha.83

## 1.0.0-alpha.82

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.82
- @fluixi/dom@1.0.0-alpha.82

## 1.0.0-alpha.81

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.81
- @fluixi/dom@1.0.0-alpha.81

## 1.0.0-alpha.80

### Patch Changes

- Updated dependencies [fa19974]
- Updated dependencies [fa19974]
  - @fluixi/dom@1.0.0-alpha.80
  - @fluixi/reactive@1.0.0-alpha.80

## 1.0.0-alpha.79

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.79
- @fluixi/dom@1.0.0-alpha.79

## 1.0.0-alpha.78

### Patch Changes

- Updated dependencies [f121072]
  - @fluixi/reactive@1.0.0-alpha.78
  - @fluixi/dom@1.0.0-alpha.78

## 1.0.0-alpha.77

### Patch Changes

- Updated dependencies [017317d]
- Updated dependencies [daa47d7]
  - @fluixi/dom@1.0.0-alpha.77
  - @fluixi/reactive@1.0.0-alpha.77

## 1.0.0-alpha.76

### Patch Changes

- Updated dependencies [122e8f5]
  - @fluixi/reactive@1.0.0-alpha.76
  - @fluixi/dom@1.0.0-alpha.76

## 1.0.0-alpha.75

### Patch Changes

- Updated dependencies [c3affda]
  - @fluixi/reactive@1.0.0-alpha.75
  - @fluixi/dom@1.0.0-alpha.75

## 1.0.0-alpha.74

### Patch Changes

- Updated dependencies [6fba3ed]
- Updated dependencies [bb5aea1]
  - @fluixi/dom@1.0.0-alpha.74
  - @fluixi/reactive@1.0.0-alpha.74

## 1.0.0-alpha.73

### Patch Changes

- Updated dependencies [7e98158]
  - @fluixi/dom@1.0.0-alpha.73
  - @fluixi/reactive@1.0.0-alpha.73

## 1.0.0-alpha.72

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.72
- @fluixi/dom@1.0.0-alpha.72

## 1.0.0-alpha.71

### Patch Changes

- Updated dependencies [e46e9c0]
  - @fluixi/dom@1.0.0-alpha.71
  - @fluixi/reactive@1.0.0-alpha.71

## 1.0.0-alpha.70

### Patch Changes

- Updated dependencies [2a317dc]
- Updated dependencies [84b1821]
  - @fluixi/dom@1.0.0-alpha.70
  - @fluixi/reactive@1.0.0-alpha.70

## 1.0.0-alpha.69

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.69
- @fluixi/dom@1.0.0-alpha.69

## 1.0.0-alpha.68

### Patch Changes

- Updated dependencies [03acf33]
- Updated dependencies [7f25a39]
  - @fluixi/dom@1.0.0-alpha.68
  - @fluixi/reactive@1.0.0-alpha.68

## 1.0.0-alpha.67

### Patch Changes

- Updated dependencies [09a321e]
  - @fluixi/dom@1.0.0-alpha.67
  - @fluixi/reactive@1.0.0-alpha.67

## 1.0.0-alpha.66

### Patch Changes

- Updated dependencies [8a53f68]
  - @fluixi/dom@1.0.0-alpha.66
  - @fluixi/reactive@1.0.0-alpha.66

## 1.0.0-alpha.65

### Patch Changes

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

- Updated dependencies [cdc5af9]
- Updated dependencies [0db63d9]
  - @fluixi/dom@1.0.0-alpha.65
  - @fluixi/reactive@1.0.0-alpha.65

## 1.0.0-alpha.64

### Patch Changes

- Updated dependencies [d075630]
- Updated dependencies [fb298c7]
- Updated dependencies [13d488e]
  - @fluixi/reactive@1.0.0-alpha.64
  - @fluixi/dom@1.0.0-alpha.64

## 1.0.0-alpha.63

### Patch Changes

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

- c883ae3: Make `JSX.CSSProperties` catch misspelled properties.

  It ended with `& { [key: string]: string | number | undefined }`, so every key
  type-checked — `style={{ colr: 'red' }}` was accepted silently, and the property
  autocomplete the first member provides was unreachable. Custom properties are
  already covered by the `--*` member, so the open fallback only removed safety.

  Also selects the string-valued members of `CSSStyleDeclaration` rather than
  excluding `length` and `parentRule` by name, which additionally drops its methods
  and numeric index (`getPropertyValue` was a valid style property before).

  Potentially breaking for a style object that sets a property newer than the
  TypeScript lib in use; set it as a custom property or widen at the call site.
  Checked against the workspace and every example — no new errors.

- Updated dependencies [9ac3eaa]
- Updated dependencies [310b9d1]
  - @fluixi/dom@1.0.0-alpha.63
  - @fluixi/reactive@1.0.0-alpha.63

## 1.0.0-alpha.62

### Patch Changes

- Updated dependencies [2f99854]
  - @fluixi/dom@1.0.0-alpha.62
  - @fluixi/reactive@1.0.0-alpha.62

## 1.0.0-alpha.61

### Patch Changes

- Updated dependencies [ee9da1c]
  - @fluixi/dom@1.0.0-alpha.61
  - @fluixi/reactive@1.0.0-alpha.61

## 1.0.0-alpha.60

### Patch Changes

- f89834a: Make intrinsic `ref` bivariant, and widen SVG attributes to reactive.

  - **ref**: the intrinsic `ref` now uses a bivariant callback plus a base-element
    (`HTMLElement`/`SVGElement`) object form. This lets a component whose props
    extend `HTMLAttributes<HTMLElement>` (the generic wrapper pattern) AND one whose
    props extend the specific element (e.g. `HTMLAttributes<HTMLUListElement>`) both
    spread `{...others}` onto the same intrinsic. Previously only one convention
    worked per tag because the `{ current: T | null }` object form is invariant —
    keeping the specific `ul`/`p`/`h1`–`h6`/`pre`/`dl` typings from the prior release
    broke consumers using the generic pattern. Both now compile.
  - **SVGAttributes**: every presentation/geometry/text/filter attribute
    (`cx`, `cy`, `r`, `d`, `transform`, `fill`, `stroke-width`, …) is widened to
    `Reactive<>` so SVG geometry can bind reactive accessors, matching
    `HTMLAttributes`/`AriaAttributes`. (Supersedes the earlier
    `jsx-specific-list-text-refs` changeset — the specificity stays, the ref
    variance is what's fixed.)
  - @fluixi/reactive@1.0.0-alpha.60
  - @fluixi/dom@1.0.0-alpha.60

## 1.0.0-alpha.59

### Patch Changes

- 7568c8d: Type the `ul`, `p`, `h1`–`h6`, `pre` and `dl` intrinsics with their specific DOM
  element (`HTMLUListElement`, `HTMLParagraphElement`, `HTMLHeadingElement`,
  `HTMLPreElement`, `HTMLDListElement`) instead of the generic `HTMLElement`, matching
  `div`/`li`/`ol` and React. Previously a component whose props extended
  `HTMLAttributes<HTMLUListElement>` couldn't spread `{...others}` onto its own `<ul>`
  (the props' `ref: Ref<HTMLUListElement>` wasn't assignable to the generic intrinsic's
  `ref: Ref<HTMLElement>` under function-parameter contravariance). Only a type change;
  no runtime effect.
  - @fluixi/reactive@1.0.0-alpha.59
  - @fluixi/dom@1.0.0-alpha.59

## 1.0.0-alpha.58

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.58
- @fluixi/dom@1.0.0-alpha.58

## 1.0.0-alpha.57

### Patch Changes

- Updated dependencies [5d92daa]
  - @fluixi/reactive@1.0.0-alpha.57
  - @fluixi/dom@1.0.0-alpha.57

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

### Patch Changes

- 59ddb69: Remove the lit-html runtime bridge from the framework — no `lit` dependency remains anywhere. `@fluixi/core` no longer lazily `import('lit')` to register a lit renderer on the client (this was also the "Lit is in dev mode" console warning); `@fluixi/dom` drops `registerLitRender`/`renderLitToNodes` and the `_$litType$`/`_$litDirective$` insert-path branches; `@fluixi/dom` and `@fluixi/jsx` drop their remaining lit type imports (`TemplateResult`/`SVGTemplateResult`/`DirectiveResult`, which were redundant in the render-type unions). Authoring with ` html` `` templates now goes through the compiled path (`@fluixi/lit`+ the compiler's`format: 'lit'`), not a runtime renderer.
- 59ddb69: Drop the unused `tslib` dependency. `importHelpers` is on in tsconfig, but these packages ship esbuild-bundled output that inlines the TS helpers — nothing in the published code imports `tslib`, so it was dead weight in `dependencies`.
- 59ddb69: Add `JSX.CSSProperties` — a typed style-object: known camelCase CSS properties (autocompleted from the DOM `CSSStyleDeclaration`), custom `--*` properties, plus a string fallback, with string-or-number values. `style` is retyped `string | CSSProperties | Accessor<string | CSSProperties>`.
- Updated dependencies [59ddb69]
- Updated dependencies [59ddb69]
- Updated dependencies [8b7f398]
- Updated dependencies [e183e9a]
- Updated dependencies [59ddb69]
  - @fluixi/dom@1.0.0-alpha.56
  - @fluixi/reactive@1.0.0-alpha.56

## 1.0.0-alpha.55

### Patch Changes

- 5cfb7a6: Add a `description` field to packages that were missing one. Without it, npm's profile/list view fell back to the first README line — the raw `<p align="center">` logo block — instead of a summary.
- daa7af2: Update READMEs for public npm: drop the GitHub Packages `.npmrc` install instructions (no auth needed on public npm) and replace the GitHub Packages registry badge with an npm version badge.
- Updated dependencies [5cfb7a6]
- Updated dependencies [daa7af2]
  - @fluixi/dom@1.0.0-alpha.55
  - @fluixi/reactive@1.0.0-alpha.55

## 1.0.0-alpha.54

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/dom@1.0.0-alpha.54
  - @fluixi/reactive@1.0.0-alpha.54

## 1.0.0-alpha.53

### Patch Changes

- Updated dependencies [9b06063]
  - @fluixi/reactive@1.0.0-alpha.53
  - @fluixi/dom@1.0.0-alpha.53

## 1.0.0-alpha.52

### Patch Changes

- 0eecc3c: Slim the client runtime: keep SSR code out of client bundles.

  The package barrel `export *`-ed the server string renderer (`renderToString`, serialization, request context) alongside the client runtime, so every client build shipped the SSR renderer. The runtime barrel now re-exports only the server node classes/guards it actually references; the renderer is re-exported as tree-shakeable named bindings from the entry (still importable as `import { renderToString } from '@fluixi/dom'`) and lives on the `@fluixi/dom/server` subpath. Added a `sideEffects` field so bundlers can drop what a client app doesn't use.

  Also removed dead code: the unused `ReactiveDOM` export/module and the unused `autoInitialize` export.

- Updated dependencies [0eecc3c]
  - @fluixi/dom@1.0.0-alpha.52
  - @fluixi/reactive@1.0.0-alpha.52

## 1.0.0-alpha.51

### Patch Changes

- Updated dependencies [8d66341]
  - @fluixi/dom@1.0.0-alpha.51
  - @fluixi/reactive@1.0.0-alpha.51

## 1.0.0-alpha.50

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.50
- @fluixi/dom@1.0.0-alpha.50

## 1.0.0-alpha.49

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.49
- @fluixi/dom@1.0.0-alpha.49

## 1.0.0-alpha.48

### Patch Changes

- Updated dependencies [7da8345]
  - @fluixi/dom@1.0.0-alpha.48
  - @fluixi/reactive@1.0.0-alpha.48

## 1.0.0-alpha.47

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.47
- @fluixi/dom@1.0.0-alpha.47

## 1.0.0-alpha.46

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.46
- @fluixi/dom@1.0.0-alpha.46

## 1.0.0-alpha.45

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.45
- @fluixi/dom@1.0.0-alpha.45

## 1.0.0-alpha.44

### Patch Changes

- Updated dependencies [aa82713]
  - @fluixi/dom@1.0.0-alpha.44
  - @fluixi/reactive@1.0.0-alpha.44

## 1.0.0-alpha.43

### Patch Changes

- Updated dependencies [71d770c]
  - @fluixi/dom@1.0.0-alpha.43
  - @fluixi/reactive@1.0.0-alpha.43

## 1.0.0-alpha.42

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
- Updated dependencies [3f0e665]
  - @fluixi/reactive@1.0.0-alpha.42
  - @fluixi/dom@1.0.0-alpha.42

## 1.0.0-alpha.41

### Patch Changes

- 82606b9: Widen reactive attribute types. `Reactive<T>` now accepts an accessor that returns `undefined` (`T | undefined | Accessor<T | undefined>`), so a conditionally-omitted attribute like `aria-disabled={() => (disabled() ? 'true' : undefined)}` type-checks without a cast — setAttribute already removes the attr on undefined/null/false. Also typed the native form attributes `required`, `readonly`/`readOnly`, `min`, `max`, `step`, `maxlength`/`maxLength`, `minlength`/`minLength`, `multiple`, `size`, `pattern` as `Reactive<>` on input/textarea/select, matching `disabled`.
- Updated dependencies [82606b9]
  - @fluixi/reactive@1.0.0-alpha.41
  - @fluixi/dom@1.0.0-alpha.41

## 1.0.0-alpha.40

### Patch Changes

- 853c4bb: Widen `hidden`, `tabindex`/`tabIndex` to `T | Accessor<T>` so a reactive `() => …` type-checks without a cast (as `class`/`style` already do; `aria-*` were widened previously).
- Updated dependencies [853c4bb]
  - @fluixi/dom@1.0.0-alpha.40
  - @fluixi/reactive@1.0.0-alpha.40

## 1.0.0-alpha.39

### Patch Changes

- Updated dependencies [0d139c4]
  - @fluixi/dom@1.0.0-alpha.39
  - @fluixi/reactive@1.0.0-alpha.39

## 1.0.0-alpha.38

### Patch Changes

- 1609beb: Allow reactive accessors on `aria-*` and `role` JSX attributes.

  `class`, `id`, `href`, `style`, etc. already accept `T | Accessor<T>`, but ARIA attributes were typed as plain values, forcing a cast to bind a reactive one. Every `aria-*` attribute and `role` now accepts `T | Accessor<T>` (via a `Reactive<T>` alias), so a function-valued ARIA prop type-checks without a cast — the runtime already applies it as a reactive render effect.

  ```tsx
  <button
    aria-checked={() => (checked() ? 'true' : 'false')}
    aria-label={() => label()}
  />
  ```

- Updated dependencies [30e6ecc]
  - @fluixi/dom@1.0.0-alpha.38
  - @fluixi/reactive@1.0.0-alpha.38

## 1.0.0-alpha.37

### Patch Changes

- Updated dependencies [fd5a896]
  - @fluixi/dom@1.0.0-alpha.37
  - @fluixi/reactive@1.0.0-alpha.37

## 1.0.0-alpha.36

### Patch Changes

- Updated dependencies [9b6215f]
  - @fluixi/dom@1.0.0-alpha.36
  - @fluixi/reactive@1.0.0-alpha.36

## 1.0.0-alpha.35

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.35
- @fluixi/dom@1.0.0-alpha.35

## 1.0.0-alpha.34

### Patch Changes

- f0926b6: fix: support a static (non-function) `innerHTML` prop. The client handler always called the value
  as an accessor (`val()`), so a plain string like `innerHTML="<b>x</b>"` threw — and during
  hydration it wiped the element's content. It now sets a string directly and only wraps a function
  in an effect. `@fluixi/jsx` types `innerHTML` as `string | (() => string)` to match.
- Updated dependencies [f0926b6]
- Updated dependencies [0c2ecb7]
  - @fluixi/dom@1.0.0-alpha.34
  - @fluixi/reactive@1.0.0-alpha.34

## 1.0.0-alpha.33

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.33
- @fluixi/dom@1.0.0-alpha.33

## 1.0.0-alpha.32

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.32
- @fluixi/dom@1.0.0-alpha.32

## 1.0.0-alpha.31

### Patch Changes

- Updated dependencies [90ae430]
  - @fluixi/dom@1.0.0-alpha.31
  - @fluixi/reactive@1.0.0-alpha.31

## 1.0.0-alpha.30

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.30
- @fluixi/dom@1.0.0-alpha.30

## 1.0.0-alpha.29

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.29
- @fluixi/dom@1.0.0-alpha.29

## 1.0.0-alpha.28

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.28
- @fluixi/dom@1.0.0-alpha.28

## 1.0.0-alpha.27

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.27
- @fluixi/dom@1.0.0-alpha.27

## 1.0.0-alpha.26

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.26
- @fluixi/dom@1.0.0-alpha.26

## 1.0.0-alpha.25

### Patch Changes

- Updated dependencies [042d86a]
  - @fluixi/dom@1.0.0-alpha.25
  - @fluixi/reactive@1.0.0-alpha.25

## 1.0.0-alpha.24

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.24
- @fluixi/dom@1.0.0-alpha.24

## 1.0.0-alpha.23

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.23
- @fluixi/dom@1.0.0-alpha.23

## 1.0.0-alpha.22

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.22
- @fluixi/dom@1.0.0-alpha.22

## 1.0.0-alpha.21

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.21
- @fluixi/dom@1.0.0-alpha.21

## 1.0.0-alpha.20

### Patch Changes

- Updated dependencies [8640cac]
- Updated dependencies [3043097]
  - @fluixi/dom@1.0.0-alpha.20
  - @fluixi/reactive@1.0.0-alpha.20

## 1.0.0-alpha.19

### Patch Changes

- Updated dependencies [e6ad857]
- Updated dependencies [f2e3b2a]
  - @fluixi/reactive@1.0.0-alpha.19
  - @fluixi/dom@1.0.0-alpha.19

## 1.0.0-alpha.18

### Patch Changes

- Updated dependencies [8f4c8cf]
- Updated dependencies [6ccf203]
  - @fluixi/dom@1.0.0-alpha.18
  - @fluixi/reactive@1.0.0-alpha.18

## 1.0.0-next.17

### Patch Changes

- Updated dependencies [a1c29ec]
  - @fluixi/dom@1.0.0-next.17
  - @fluixi/reactive@1.0.0-next.17

## 1.0.0-next.16

### Patch Changes

- Updated dependencies [ef9231f]
- Updated dependencies [ea5c098]
- Updated dependencies [3932e9d]
- Updated dependencies [ea5c098]
  - @fluixi/dom@1.0.0-next.16
  - @fluixi/reactive@1.0.0-next.16

## 1.0.0-next.15

### Patch Changes

- @fluixi/reactive@1.0.0-next.15
- @fluixi/dom@1.0.0-next.15

## 1.0.0-next.14

### Minor Changes

- bbf21b9: Drop the "kettle" name now that the org is fluixi. BREAKING — no aliases.

  - **`@fluixi/kettlejs` → `@fluixi/core`** (facade package + folder). Update imports,
    including subpaths: `@fluixi/core/router-next`, `/plugins`, `/client`, `/server`,
    `/jsx-runtime`, `/rx`.
  - **`@fluixi/jsx-runtime` → `@fluixi/jsx`** (package + folder). Set
    `jsxImportSource: "@fluixi/jsx"` in tsconfig (was `@fluixi/core`) and add `@fluixi/jsx`
    to app deps; the `/jsx-runtime` + `/jsx-dev-runtime` subpaths are unchanged.
  - **All remaining `kettle` identifiers/contracts → `fluixi`:** `KettleJS` → `Fluixi`,
    `KettleElement` → `FluixiElement`, `kettleRoutesPlugin` → `fluixiRoutesPlugin`,
    `virtual:kettle-routes` → `virtual:fluixi-routes`, `__KETTLE_HYDRATION__` →
    `__FLUIXI_HYDRATION__`, the `kettle-js` root attribute → `fluixi-js`, the
    `kettle-generate`/`kettle-run` bins → `fluixi-generate`/`fluixi-run`.
  - The `@fluixi/kettlejs-test` test harness → `@fluixi/core-test`.

  No API/behavior changes — names only.

  Also removes the dead React bridge from `@fluixi/jsx` (`jsx.ts`: `getJSX`/`loadReact`/
  `ensureReactInit`/`ComponentChild` — exported but unused, only a lazy `import('react')`),
  dropping the `react`/`react-dom`/`@types/react` dev deps. `@fluixi/jsx` no longer pulls
  React in any form.

### Patch Changes

- @fluixi/reactive@1.0.0-next.14
- @fluixi/dom@1.0.0-next.14

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

- Updated dependencies [2b6fcd3]
  - @fluixi/dom@0.4.0-next.13
  - @fluixi/reactive@0.4.0-next.13

## 0.4.0-next.12

### Patch Changes

- @fluixi/reactive@0.4.0-next.12
- @fluixi/dom@0.4.0-next.12
- @fluixi/lit@0.4.0-next.12

## 0.4.0-next.11

### Patch Changes

- @fluixi/reactive@0.4.0-next.11
- @fluixi/dom@0.4.0-next.11
- @fluixi/lit@0.4.0-next.11

## 0.4.0-next.10

### Patch Changes

- Updated dependencies [92bf164]
- Updated dependencies [92bf164]
  - @fluixi/dom@0.4.0-next.10
  - @fluixi/lit@0.4.0-next.10
  - @fluixi/reactive@0.4.0-next.10

## 0.4.0-next.9

### Patch Changes

- @fluixi/reactive@0.4.0-next.9
- @fluixi/dom@0.4.0-next.9
- @fluixi/lit@0.4.0-next.9

## 0.4.0-next.8

### Patch Changes

- @fluixi/reactive@0.4.0-next.8
- @fluixi/dom@0.4.0-next.8
- @fluixi/lit@0.4.0-next.8

## 0.4.0-next.7

### Patch Changes

- Updated dependencies [59aa5a9]
  - @fluixi/reactive@0.4.0-next.7
  - @fluixi/dom@0.4.0-next.7
  - @fluixi/lit@0.4.0-next.7

## 0.4.0-next.6

### Patch Changes

- Updated dependencies [901c975]
  - @fluixi/reactive@0.4.0-next.6
  - @fluixi/dom@0.4.0-next.6
  - @fluixi/lit@0.4.0-next.6

## 0.4.0-next.5

### Patch Changes

- @fluixi/reactive@0.4.0-next.5
- @fluixi/dom@0.4.0-next.5
- @fluixi/lit@0.4.0-next.5

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
  - @fluixi/dom@0.4.0-next.4
  - @fluixi/lit@0.4.0-next.4

## 0.4.0-next.3

### Patch Changes

- @fluixi/reactive@0.4.0-next.3
- @fluixi/dom@0.4.0-next.3
- @fluixi/lit@0.4.0-next.3

## 0.4.0-next.2

### Patch Changes

- Updated dependencies [97cc220]
  - @fluixi/reactive@0.4.0-next.2
  - @fluixi/dom@0.4.0-next.2
  - @fluixi/lit@0.4.0-next.2

## 0.4.0-next.1

### Patch Changes

- @fluixi/reactive@0.4.0-next.1
- @fluixi/dom@0.4.0-next.1
- @fluixi/lit@0.4.0-next.1

## 0.4.0-next.0

### Patch Changes

- Updated dependencies [fd33c30]
- Updated dependencies [7395dc9]
- Updated dependencies [7a2cdcd]
- Updated dependencies [a46d4cf]
- Updated dependencies [80aded7]
- Updated dependencies [9effed1]
  - @fluixi/reactive@0.4.0-next.0
  - @fluixi/dom@0.4.0-next.0
  - @fluixi/lit@0.4.0-next.0

## 0.3.0

### Patch Changes

- Updated dependencies [24388bb]
  - @fluixi/dom@0.3.0
  - @fluixi/lit@0.3.0
  - @fluixi/reactive@0.3.0

## 0.2.1

### Patch Changes

- @fluixi/reactive@0.2.1
- @fluixi/dom@0.2.1
- @fluixi/lit@0.2.1

## 0.2.0

### Patch Changes

- @fluixi/reactive@0.2.0
- @fluixi/dom@0.2.0
- @fluixi/lit@0.2.0

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

- Updated dependencies [78dd576]
  - @fluixi/lit@0.1.0
  - @fluixi/dom@0.1.0
  - @fluixi/reactive@0.1.0

## 0.0.1

### Patch Changes

- @fluixi/reactive@0.0.1
- @fluixi/dom@0.0.1
- @fluixi/babel-plugin-jsx@0.0.1
