# @fluixi/template-parser

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
