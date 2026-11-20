# @fluixi/template-parser

## 1.0.0-alpha.112

## 1.0.0-alpha.111

## 1.0.0-alpha.110

### Patch Changes

- c98e9c9: The build now fails on broken HTML templates, prints warnings with file positions (including accessibility warnings such as img without alt) at build time, and no longer reports using `if` and `each` together on one element as an error.
- 933bfdd: `<div><span>x</div>` now reports Unclosed `<span>`, the element left open; before, it named the `<div>`, whose closing tag the `<span>` had taken.

## 1.0.0-alpha.109

### Patch Changes

- 2122aa0: An imported component that has a `load:` and also a use without `load:` in the same file now treats both uses as eager, as with a resolve rule. A warning now appears when `load:never` is placed next to an eager use of the same component. When `load:` is used on `NS.default`, the message now names the namespace import. In HTML templates, a hole in a `load:` value is now refused like JSX, and using `load:` on `<${Chart}>` now prompts a message to write the bare tag.
- c530572: The library now builds with mix-builder 0.4.3, sharing chunks across ES module entries so each module and its state appears only once and the published ES module files are 50-80 % smaller, with CDN globals using a single copy of the signal graph.

## 1.0.0-alpha.108

### Patch Changes

- 8519d9b: SVG primitives such as `linearGradient`, `radialGradient`, `stop`, `mask`, `pattern`, `filter` and animation elements are recognized in the SVG namespace and rendered correctly, including when returned in a fragment outside an `<svg>` or as children of an SVG element, while `foreignObject` content is treated as HTML.

## 1.0.0-alpha.107

## 1.0.0-alpha.106

## 1.0.0-alpha.105

## 1.0.0-alpha.104

## 1.0.0-alpha.103

## 1.0.0-alpha.102

## 1.0.0-alpha.101

## 1.0.0-alpha.100

## 1.0.0-alpha.99

## 0.1.0-alpha.4

### Patch Changes

- f121072: The npm descriptions no longer claim things that do not exist: Solid compatibility, an SWC compiler front-end, a language server, and a Biome plugin.

## 0.1.0-alpha.3

### Minor Changes

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

## 0.1.0-alpha.2

### Minor Changes

- 4b5e5fb: Accessibility warnings, and a consistent event name.

  Five structural rules over the template AST: an `img` with no `alt`, an `a` with
  no `href`, an `iframe` with no `title`, a positive `tabindex`, and a click handler
  on an element that isn't keyboard-reachable. They live in the parser rather than
  in a consumer because the language service and the compiler both parse templates,
  so one implementation reaches the editor and the build.

  Every rule is structural — no types, no scope analysis. A rule that cannot be
  certain stays silent: anything carrying a spread is skipped entirely, since the
  spread may supply the very attribute being looked for. An accessibility warning
  that cries wolf gets switched off, and then the real ones are lost too. All are
  warnings; none make a template invalid. Opt out with `accessibility: false`.

  `EventBindingNode.name` is now the DOM event name whatever the spelling. It was
  documented as lowercased but only was for `@click` and `on:click` — `onMouseDown`
  produced `MouseDown`. Compilation was unaffected because lowering lowercases
  defensively, so this only ever bit a consumer that trusted the documented
  contract. `syntax` still records which form was written.

## 0.1.0-alpha.1

### Minor Changes

- e183e9a: New package: a dependency-free tokenizer + recursive-descent parser for html``
  templates. Produces a located, recoverable Template AST with diagnostics — the
  shared foundation the compiler, TypeScript plugin, and language server build on.
