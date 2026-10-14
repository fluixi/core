# @fluixi/compiler

## 1.0.0-alpha.98

## 1.0.0-alpha.97

## 1.0.0-alpha.96

## 1.0.0-alpha.95

### Minor Changes

- 6919cbc: Component styles now build and hot-reload on Vite 8, with each block served as `card.tsx.fx-0.css` and any edited style updating in the dev server without a restart.
- 06a5af9: The compiler now sets JSX through oxc when Vite bundles with Rolldown and through esbuild otherwise, start now builds single-file bundles with the option each bundler expects, the env check now includes the file name in its error under Vite 8, and fluixi check and fluixi doctor now work in a TypeScript 7 app by falling back to the CLI's classic TypeScript.

### Patch Changes

- 0b23d7d: In devtools, a rule from a `css` value imported from another module now points to the line it was written on in that module, and the dev server enables CSS source maps by default unless the app sets `css.devSourcemap`.

## 1.0.0-alpha.94

### Minor Changes

- fc31dad: ` css`` literals from @fluixi-css/core are compiled away into style handles, the CSS import is removed, processed CSS is returned in  `styleLiterals`and emitted only where used, interpolations like`${value}` within `css`` or `<style>{\`${value} ...\`}</style>`merge processed nodes in order (scoped values respect the component's scope), and values imported from other modules appear in`styleReferences`while non-style interpolations and cycles are reported in`styleDiagnostics`.
- 8362b9a: `css` and the `FluixiStyle` type are now exported from `@fluixi/core` (and `@fluixi/dom`) alongside `html` and `svg`. In an app, `$html`, `$svg` and `$css` need no import and compile like the other tags. The compiler no longer reads `css` from `@fluixi-css/core`.
- 27a74db: In a library build (`build.lib`), component styles are emitted as `<name>.css` files alongside each module and imported relatively, with a matching `<name>.css.js` loader, and a build will error if it would overwrite an existing `<name>.css` file.
- 3921c35: `transformTemplates` now extracts `<style>` and `<style scoped>` blocks from JSX, processes them with the host's CSS engine via `styles: { process(css, from) }`, and returns the resulting styles while adding a deterministic `data-fx-s` attribute to rendered elements for scoped styles and leaving unprocessable blocks in the output with diagnostics.
- 232b766: Templates with `<style>` and `<style scoped>` now compile like the JSX form, extracted, processed by the host's CSS engine, scoped, and returned in `styles`, and each component now receives a single id shared across its JSX and template blocks, with a custom element's render() blocks belonging to the class name.
- 43d46e2: An element with static shadow now gets its `<style>` blocks in its shadow root as CSS strings without a scoping attribute, css`` values in static styles are compiled to CSS strings, and light-DOM elements and components remain scoped and served as page stylesheets.
- 20ef9f9: Custom properties in a style object (`--gap`) now apply, `style:x` and `class:x` update only their own property when its value changes, JSX `class:x` and `style:x` on DOM elements work as in html``templates (JSX cannot parse`style:--x`, use `style={{ '--x': ... }}`), `style={{ ... }}`on a DOM element updates per property and removes keys missing from the new object, and`style=`together with`style:x` in a template no longer produces a duplicate key.
- 97fae85: Component styles now carry a source map back to the module, with each rule and declaration mapping to the line it was written on in the `.tsx`, and the Vite plugin serves the map, which Vite keeps under `css.devSourcemap` in development and `build.sourcemap` in builds.
- 5de732d: `<style>` in an html`` template now accepts CSS values by name, `${base}`, locally defined or imported from another module, refuses other values with the same JSX error message, and html`` style blocks now receive source maps back to the template lines.
- 3cef411: The Vite plugin now compiles component `<style>` blocks, resolves ` css``` values imported from other modules through Vite, hashes scope ids from the project root so elements and CSS always match, and its devtools channel calls the compiler plugin's own  `load`and`configureServer` instead of replacing them.

### Patch Changes

- f0b00eb: An edited `<style>` block now updates in the dev server, and a style requested before its component's imports were analyzed no longer keeps its old CSS until the dev server restarts.
- 2daa24b: HTML templates now decode character references like `&nbsp;`, `&amp;`, `&copy;`, and numeric references in text and static attributes, the same set JSX accepts.
- c5f2df6: Component props with an object literal value now compile even when a sibling prop or text child mentions `this`.

## 1.0.0-alpha.93

### Minor Changes

- 501e7e5: The new `$cachedResource` intrinsic provides `cachedResource` without requiring an import.
- aaf6521: Each on an element now renders the element once and its content per item, and `<container>` now renders only its content while supporting `if`, `else`, `each`, and `key` in JSX. You must move `each` to the parent element, converting `<li each>` to `<ul each>` with the `<li>` placed inside the render function.
- c278b4c: `$storage` stands for `useStorage`, `$asyncStorage` stands for `useAsyncStorage`, and `$persisted` stands for `persisted` from `@fluixi/core/storage`.

### Patch Changes

- 1c2333c: A signal in a class field inside a function no longer breaks the dev build, and a class field signal shows its own line and field name in the devtools graph.
- 36bf7d7: Development builds now record where each subclass is declared and which instance a class field signal belongs to for the devtools graph.
- 3a20e09: The new app's `fluixi.d.ts` now declares every reactive intrinsic from the compiler's table and the compiler exports them via `@fluixi/compiler/intrinsics`.
- 4ac7bba: Functions passed to a custom element property are now assigned instead of being called as an accessor, so actions and callbacks reach the element as functions, also on the server.
- 1f60b01: The compiler now provides intrinsics `$batch`, `$cleanup`, `$root`, `$context`, `$renderEffect` and `$computed` that can be used without importing them in a start app.
- 330c257: `this` in a component prop now keeps the enclosing method's value, allowing a custom element's render to pass `this.x` into a component prop.

## 1.0.0-alpha.92

### Minor Changes

- ae69e32: `$env` now compiles to `env` from `@fluixi/start/env`, and when a module binds that name itself, the runtime is imported under an alias instead of the call reaching the local binding.
- 4933804: `fluixi.d.ts` now declares each component that a resolve pattern rule reaches, generating one declaration per file in the directory matching the module path, and adds a new `componentGlobals` option for candidates.

## 1.0.0-alpha.91

## 1.0.0-alpha.90

## 1.0.0-alpha.89

## 1.0.0-alpha.88

## 1.0.0-alpha.87

### Patch Changes

- 190493a: The `./builtins`, `./transform` and `./analyze` modules are now included in the published package.
- 807fb8a: A binding on a custom element sets the property even when the element has not upgraded yet. `key in element` is false until `customElements.define` runs, so a page rendered before its element registered sent every value to an attribute and an object arrived as `[object Object]`, with nothing assigning the property once the element upgraded. The global attributes (`id`, `class`, `slot`, `title`, `aria-*`, `data-*` and the rest) still go to attributes. The compiler marks a dash tag while compiling, so the runtime is told rather than reading the tag back off the node.

## 1.0.0-alpha.86

## 1.0.0-alpha.85

### Patch Changes

- ea498ef: `set` now writes to the path it names using the provided step(s) and value, the server-function `scan` now ignores directives inside comments, the devtools agent now resolves the ESM build instead of the CJS one, and the AsyncLocalStorage warning now appears only on the server.

## 1.0.0-alpha.84

### Patch Changes

- 9565405: The published entry files now include a copyright banner, and `@fluixi/dom`, `@fluixi/jsx`, `@fluixi/template-parser` and `@fluixi/template-runtime` ship unminified, which their build configs had always asked for.
- aa17d01: `@fluixi/cli`, `@fluixi/devtools`, `@fluixi/head`, `@fluixi/router`, `@fluixi/server`, and `@fluixi/start` now provide bundled builds with import resolving to a `.mjs` file and a require condition resolving to a `.cjs` file, and `@fluixi/core` and `@fluixi/compiler` now include the copyright banner in their subpath exports.
- e077a97: Compiled output now emits parentheses only when they change an expression's meaning.

## 1.0.0-alpha.83

### Minor Changes

- e005759: `jsx` tags and elements now record their source positions, which are emitted beside the template string.
- f1d153c: `@fluixi/compiler/analyze` now reads a project's reactive graph out of source without running it, and each reactive hole now carries the line it was written on, in development builds only. The source map could not give them because a template is emitted as one overwrite, so its source map holds a single entry for the whole root, making every hole in it trace back to the line the template opens at.
- e005759: `analyze` now reads the element tree each component writes and hangs it on the node.
- ae9784f: A component now reports the props it was handed, the compiler records where each was written, and the inspector shows both.
- f5b4031: `use`, `ref`, `bind`, `class` and `style` directives now report their name, their element and the position they were written at.

## 1.0.0-alpha.82

## 1.0.0-alpha.81

### Patch Changes

- 231a169: Importing a retired subpath now fails the build with the name of the replacement and the file that imported it, rather than the bundler reporting a missing specifier.

## 1.0.0-alpha.80

### Minor Changes

- c698a5c: The new `@fluixi/template-runtime` package compiles `html` and `svg` templates in the browser, with no build step, and `@fluixi/compiler` now includes a `./compile` subpath that excludes node-specific dependencies.

### Patch Changes

- 4a30116: The package name remains `@fluixi/core`, and the router subpath is now `@fluixi/core/router` — if you previously tried using `fluixi` or `@fluixi/core/router-next`, update your imports accordingly.

## 1.0.0-alpha.79

### Minor Changes

- 21a13fd: The package is now named `fluixi` instead of `@fluixi/core`, with the same contents and subpaths; all other `@fluixi/*` packages retain their names.
  Replace `@fluixi/core` with `fluixi` in `package.json` and all import statements, and update subpaths like `@fluixi/core/server` to `fluixi/server`.
- 21a13fd: The router subpath is now `fluixi/router`; it was previously `@fluixi/core/router-next`.
- 21a13fd: The `rx` subpath is removed and replaced with `@fluixi/reactive` for signals and effects, and `fluixi/server` for server-side primitives.

## 1.0.0-alpha.78

### Patch Changes

- f121072: The npm descriptions no longer claim things that do not exist: Solid compatibility, an SWC compiler front-end, a language server, and a Biome plugin.
- Updated dependencies [f121072]
  - @fluixi/template-parser@0.1.0-alpha.4

## 1.0.0-alpha.77

### Minor Changes

- 56bb9b9: `load:` now works on a component you imported yourself.

  It used to do nothing there: deferring means creating the reference as a dynamic
  import, and a static one was already in the way. The static import is removed now and
  the `deferred()` binding takes its place, so the chunk splits like any other.

  Only when the name is used exclusively as a tag. JSX element names are
  `JSXIdentifier`, so any `Identifier` reference at all — `register(Chart)`, a re-export,
  `Chart.displayName` — means the import stands and the directive is reported instead,
  since a lazy wrapper is not what those sites expect. Namespace imports and components
  declared in the file are reported too: there is no single export to defer.

  This reverses a prior rule that an author-written import always won. An import and a
  `load:` on the same name are two instructions that cannot both hold, and the directive
  is the more specific one.

- 5691dc5: Turn `propsDestructure` on by default.

  A component can take its props apart the plain way and the bindings stay live reads;
  `...rest` becomes the `splitProps` call you would have written. What the rewrite can't
  prove safe it leaves as written and reports.

  **Turn it off for a package that ships its source** for consumers to compile — an
  `exports` entry pointing at `.ts`. The rewrite is a property of how code is compiled,
  so a consumer without the option would read those props once. Compiled output is fine
  either way.

### Patch Changes

- d93fdf3: Say when a component reference or a `load:` directive can't work.

  Both cases built cleanly and failed at runtime with no trace anywhere else:

  - A capitalised tag nothing imports and no `resolve` rule supplies compiles to a
    reference to a name that does not exist, so the component renders nothing.
    Commenting one line out of a `resolve` map was enough.
  - A deferring `load:` on a component the compiler doesn't supply is dropped, because
    deferring means creating the binding as a dynamic import and there is nothing to
    create. The chunk then ships eagerly, and nothing says so.

  Both warn now, naming the component and which situation it is, since the fixes
  differ. Warnings print once per message per module, so a watch rebuild doesn't
  repeat them.

## 1.0.0-alpha.76

### Minor Changes

- 051fdeb: Add `propsDestructure`. With it on, a component can take its props apart the
  plain way and the compiler rewrites the bindings into reads, so they stay
  reactive:

  ```tsx
  function Hello({ name, tone = 'calm' }) {
    return <p data-tone={tone}>{name}</p>;
  }
  ```

  Each use compiles to `props.name`, so the binding keeps its type and nothing else
  about the function changes. `...rest` becomes the `splitProps` call you would have
  written, which carries the remaining props across as getters. Aliases, defaults
  and nested patterns work; a default still applies only to `undefined`.

  Anything the rewrite can't prove is left exactly as written and reported — a
  reassigned binding, a computed key, a default that would have to re-run on every
  read.

  Off by default. It's a property of how code is compiled, so a package that ships
  its source for others to compile should keep writing props explicitly.

- 122e8f5: Add the `$` reactive intrinsics. `$signal`, `$memo`, `$effect` and `$store` compile
  to the runtime calls they stand for, with the import added for whatever a module
  actually used:

  ```tsx
  const count = $signal(0); // → signal(0), plus the import
  ```

  They are the runtime API under another spelling, not a second one — `$signal`
  compiles to `signal`, so there is one reactive graph and no difference in lifecycle,
  SSR or hydration.

  The compiler resolves a primitive by where its binding came from rather than by how
  the name reads, so `import { signal as state }` is recognised and a local
  `function signal()` is not. A module that binds a `$` name itself keeps its own
  meaning, and that is reported rather than rewritten.

  On by default: `$signal` is a reference error otherwise, so there is nothing for it
  to break. `intrinsics: false` turns it off.

## 1.0.0-alpha.75

## 1.0.0-alpha.74

### Major Changes

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

### Minor Changes

- f995106: The webpack, rollup and esbuild adapters compile without babel.

  Only the vite one had been ported; the other three still called
  `babel.transformAsync` unconditionally, which made babel required for anyone not
  using vite. All four now go through one `compileModule`, so an adapter cannot
  drift from the others — a bundler integration growing its own compile logic is
  how the two paths diverged the first time.

  The esbuild adapter returns a `ts`/`tsx` loader rather than `js`: the transform
  leaves types in place for the bundler to strip, which esbuild has to be told.
  Rollup and esbuild also now accept `.ts`/`.jsx`, not only `.tsx`.

  This is what makes babel an integration rather than a requirement — the position
  Svelte and Vue are in, where the compiler is standalone and each bundler gets a
  thin wrapper.

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

- b747b26: One lowering. The compiler had two implementations of every JSX semantic and
  compiled with only one of them.

  `plugin.ts` carried a full second lowering — the `codegen: 'inline'` path, plus
  the `backend: 'jsx'` factory emitter — alongside the IR pipeline that has been
  the default for some time. Nothing selected either one; the only references left
  in the repository were two tests written for them, and the option's own docstring
  still advertised `inline` as the default it had stopped being. Meanwhile the two
  implementations had to agree about `ref`, `use:`, spreads, control flow and
  template cloning, and when they disagreed it shipped: `codegen: 'ir'` went out as
  alpha.71 and broke three `@fluixi/ui` packages.

  Removed: 39 of the 46 functions in `plugin.ts:898-2555` (~1,400 lines) and the
  `backend`, `codegen`, `runtime`, `pragma`, `pragmaFrag`, `hoistStatics`,
  `useLitHTML`, `optimizeControlFlow`, `autoShowTransform`, `detectReactivity`,
  `delegatedEvents` and `optimize` options that only fed them. JSX and ` html` ``templates now take the same path they already took: build IR, run the imperative
backend, splice the emitted code back in. Compiled output for`examples/start-app`
  is byte-identical before and after.

  `backend: 'jsx'` is gone, but the `@fluixi/jsx` **runtime** is not: it is still
  what TypeScript's `jsxImportSource` resolves types through and what esbuild's
  automatic runtime targets. This compiler simply never emits a `jsx()` call.

  Also removed from `@fluixi/compiler/integrations`: a regex-based `transform()`
  that every adapter silently fell back to when `@babel/core` failed to load. It
  could not compile JSX, so it returned source whose templates had never become DOM
  calls — a build that reported success and failed when the page opened. Missing
  babel is now a hard error, and a compile error propagates instead of being
  swallowed and replaced with half-transformed source. The dead `generate:
'ssr' | 'hydrate'` option, which nothing has ever read, is gone too.

  Nothing that compiles today compiles differently. Configs passing a removed
  option get a type error naming it, rather than an option that silently does
  nothing.

- f2d3779: `"use server"` compiles on the native path.

  `transformServerFns` finds the directive, and either replaces the whole function
  with an RPC stub (client build) or wraps it in its registration and drops the
  directive (server build) — by rewriting spans, so the body that stays is the
  author's own text.

  The id a server function is registered and called by moves to
  `transform/server-fn-id.ts` and is shared with the babel path. Client stub and
  server registration come from separate builds of the same file, so the two have
  to agree exactly; a test compiles the same sources both ways and compares the ids
  they produce.

  `serverFunctionsVitePlugin({ native: true })` selects it. On
  `examples/start-app` — which uses a server function behind a `<Form>` action —
  both paths serve identical HTML and answer the POST the same way.

- 6e586c0: `compileTemplate()` — compile a template to runtime calls with no Babel in the path.

  The template lowering moves out of the Babel front-end into `lower/template.ts`,
  which imports nothing from a JavaScript toolchain. What a front-end still owns is
  the holes, because reading `${…}` means reading JavaScript; it hands them over as
  `TemplateHole` — source text, whether the expression is reactive, and the two
  structural facts the lowering branches on (a single-expression arrow for `each`,
  an object literal for `class`). Deliberately conclusions, never a syntax tree: if
  the lowering could ask a parser a new question, the dependency grows back one
  field at a time.

  `compileTemplate(source, options)` then runs parse → lower → resolve → optimize →
  emit and returns code, the runtime symbols to import, and the IR. It runs the same
  passes in the same order as the Babel front-end, and a differential test compiles
  ten templates both ways and compares the emitted code.

  One difference worth knowing: this path passes hole source through verbatim where
  the Babel path reprints it through `@babel/generator`, so output matches the
  author's formatting rather than the printer's.

  Not yet a module compiler. Finding templates inside a JavaScript file, and
  describing each hole without a parser, is the remaining piece.

- 458f2e4: `native: true` on the Vite plugin compiles without babel.

  The plugin gains parity with the front-end it replaces: delegated events are
  registered, components a `resolve` rule supplies are imported, lazy ones become
  `deferred(() => import(…))` bindings with their strategy, and `@fluixi/core/rx`
  is rewritten to `@fluixi/reactive`. Names already bound in the file win, as
  before.

  On `examples/start-app` the two paths serve **byte-identical HTML** — the only
  difference in the built output is the client bundle's content hash, since the
  emitted text is not the same bytes. On the compile step alone the native path is
  **15-18x faster** (27 KB fixture, 100 components: ~156 ms → ~10 ms). Whole-build
  time moves much less on a small app, where Vite and rollup dominate.

  Types are left in place for esbuild to strip, which it does after this plugin
  runs either way — so `@babel/preset-typescript` is not needed on this path.

  Opt-in while the two are compared on real apps. TypeScript stripping, JSX,
  ` html` ``, nesting in either direction, and source maps are covered; the
`"use server"` transform still runs through babel.

- 3a9607b: `@fluixi/compiler/transform` — compile a module's templates without running as a
  Babel plugin.

  `transformTemplates(code, id, options)` parses once, finds every `` html`...` ``
  and `` svg`...` ``, and splices the emitted runtime calls over their spans with
  magic-string. Two things follow from owning the transform rather than living
  inside someone else's pipeline:

  - **Source maps.** The plugin path emits none — every generated node inherits one
    location from the template. A splice carries real mappings.
  - **No reparse.** Holes are source slices, so nothing is printed and re-parsed.
    That round-trip is 70% of compile time on the plugin path.

  Holes keep the author's formatting, since they are never reprinted. Import
  injection skips names already bound at module scope, which is the same answer
  `path.scope.hasBinding` gives on the Program path.

  `@babel/parser` becomes a dependency and is the only babel package the transform
  touches — a parser used as a library, the way Vue uses one. `@babel/core`,
  `@babel/generator` and `@babel/helper-plugin-utils` stay optional peers belonging
  to the plugin front-end, and `no-babel-in-core.spec.ts` fails the build if that
  line moves.

  JSX still goes through the plugin. Nothing changes for existing builds.

- 8e1e0f4: Move the reactivity rule out of the Babel front-end.

  Whether `count()` is wired reactively while `count` is not, and whether
  `props.children` counts as a value to track, is a Fluixi decision. It was written
  against `@babel/types` inside `build-ir.ts`, which meant the rule could only be
  read — and only be tested — through a parser.

  It now lives in `@fluixi/compiler`'s `analyze/reactive-expr.ts` as
  `isReactiveShape(shape)` over a four-case `ExprShape` (`call`, `member`,
  `compound`, `opaque`). The Babel front-end keeps only the mapping from its AST to
  those shapes, which is the part that genuinely belongs to a front-end; a second
  front-end supplies its own mapping and inherits the semantics unchanged.

  `ExprShape` is deliberately narrow and must not grow into a JavaScript AST: every
  syntax the rule does not branch on collapses to `compound` (reactive when a part
  is) or `opaque`. Which sub-expressions count stays with the front-end — a spread
  element or a computed key contributes nothing, because the compiler cannot see
  what it would introduce.

  Behaviour is unchanged: `examples/start-app` compiles to a byte-identical bundle,
  and the rule now has a 39-case table covering both the shapes and the syntax that
  maps onto them.

- 33c3574: JSX compiles through the transform, on the same builder as the plugin.

  `buildJsxIR` moves to `lower/jsx.ts` and reads `node.type` instead of a parser's
  helpers, asking the caller for an expression's source through `code()` — a
  front-end that can slice the original text returns that, one that reprints
  returns the printed form. Both paths get the same IR from one builder rather than
  two that have to agree.

  The two shape mappers collapse into one: `shapeOf` in `analyze/expr-shape.ts`
  reads node types, so it serves the Babel AST and any ESTree-shaped one. The
  32-case syntax table now covers it.

  `moduleBindings` — which decides whether an injected import would collide — is
  checked against `path.scope.hasBinding` over 22 cases, including array holes,
  rest elements, nested destructuring and exported declarations. A missed binding
  emits a duplicate declaration; a phantom one drops an import the code needs.

  `transformTemplates` handles JSX, ` html` ``, and either nested in the other.
  Still not wired into the Vite plugin.

### Patch Changes

- 8da12e6: Compiler specs run against the default path.

  Every semantic spec — directives, `use:`, `load:`, component resolution, slots,
  control flow, template cloning, the imperative fixtures — compiled through the
  babel plugin, which is now the optional integration. So the path that ships was
  the one without the coverage. They compile through `transformTemplates` now; the
  two that stay on babel do so deliberately, and say why: `compile-cost` measures
  both, `templates.spec` is the differential between them.

  `format` comes back as a transform option. It selected which syntaxes the plugin
  touched, and the transform had quietly always compiled both — a dropped option is
  worse than a kept one, since a config that sets it would silently mean something
  else.

- 9817f51: Hoist static templates to module scope on the native path.

  `compilePieces` gains `hoistTemplates`, which leaves the `_tmpl$N` references in
  place and hands the templates back for a caller with a module scope to declare
  them in — matching what the plugin emits. `compileTemplate` still inlines, having
  nowhere to hoist to.

  Bundle size is unchanged either way (`templateCache` is keyed by the string, not
  its identity, so an inlined template still parses once), but the output shape now
  matches the path it is replacing.

- f0dd4e3: The native path is checked against the babel one over 681 real files.

  `store-admin` and `storefront`, the whole `@fluixi-ui` component library, its
  playground, and this repo's docs, web, examples and playground: 281 files
  containing JSX or templates compiled both ways and compared on what the output
  does — element and template calls, inserts, spreads, component calls, and the
  attribute names that reach the DOM. No failures, no differences.

  The docs site builds natively and its 53 prerendered pages are byte-identical to
  the babel build once the bundle hash is normalised.

  One open difference: the native output tree-shakes slightly less. On the
  `@fluixi-ui` playground the bundle is 487.8 kB against 477.1 kB, with the same
  225 modules in both — nothing is missing, some unused components are retained
  that the babel output lets rollup drop. Not diagnosed yet.

- 9817f51: Register delegated events for JSX nested inside an expression.

  `<button onClick={…}>` reached through a ternary, a `.map()` callback or any
  other expression never got its event added to the module's `delegateEvents`
  call. JSX nested in an expression is compiled and discarded during the walk, and
  the handlers went with it — so nothing registered the listener and the button did
  nothing unless some other module in the app happened to register the same event.

  `@fluixi-ui`'s table has exactly that shape: the sort button lives in a nested
  ternary, and `table.tsx` emitted no `delegateEvents` at all.

  Found by diffing the two compile paths over 226 real files — the native one walks
  every root, so it had been reporting the events all along. The sets now agree on
  every file.

- e035c4e: Resolve components used only inside a nested expression.

  `{(b) => <Input />}` — a render prop, a `.map()` callback, a ternary — emitted a
  reference to `Input` that nothing imported. JSX inside an expression is compiled
  and discarded during the walk, and the resolve pass only ever ran on the
  top-level node, so a component the `resolve` rules should have supplied was
  simply left unbound. At runtime that is a ReferenceError the moment the branch
  renders.

  `@fluixi-ui`'s playground has it in `FormDemo`: `Input`, `Select` and `Checkbox`
  are used only inside render props, and none of the three was imported.

  The fix replaces the ad-hoc event set threaded through `genExpr` with a hook
  called on any nested IR, which runs the same resolve, collapse and
  collect-needs passes the top-level node gets. Delegated events came along with
  it, having been the first symptom of the same hole.

  Found by diffing the native path against this one over the whole component
  library: it walks every root, so it had been resolving them correctly. The two
  now emit identical import sets on all 93 files, and the `@fluixi-ui` playground
  bundle goes from 477.2 kB to 486.7 kB — the missing components, now present.

- 0fdebdd: Fix nested edits being applied twice when slicing a hole's source.

  A hole's text is taken from the original source with any compiled root inside it
  substituted in. That substitution applied every edit within the range, including
  ones already folded into a containing edit's output — so the second write landed
  at an offset the first had moved, and the emitted expression came out truncated.

  It needed three levels to show: a hole containing a root that itself contains
  another. `examples/start-app` did not have that shape; the docs site did, and
  failed to build.

  Both the file-level splice and the slice now apply only the outermost edits.

- 4022c74: Two bugs the spec suite caught once it compiled through the transform.

  **Builtin component modules were restated in the transform.** `Await` was imported
  from `@fluixi/dom`, which does not export it, and `Portal` from core rather than
  dom. The lists live in `resolve/builtins.ts` — the same ones the resolve pass and
  the TS plugin read — and the transform now reads them instead of keeping its own
  copy.

  **Two templates could share one hoisted name.** Roots are emitted innermost first
  and spliced into their parent, so by the time the outer one is renamed its code
  already contains hoisted names. Sharing the backend's `_tmpl$N` prefix meant the
  rename rewrote those too and pointed both templates at one string — a `<Switch>`
  rendered its fallback's markup in place of the matched branch. Hoisted names use
  their own prefix now, so the two namespaces cannot be confused.

  The compiler specs compile through `transformTemplates` via `test/fixtures.ts`,
  which lives outside `src` so it is not published. Assertions on emitted text
  gained the parentheses the backend puts round a spliced expression — nothing
  reprints the output any more, and esbuild drops them.

## 1.0.0-alpha.73

### Patch Changes

- 93e06ef: Default `codegen` back to `inline`

  `1.0.0-alpha.71` made `ir` the default. Running a real component library against it found
  two separate defects: `ref` was thunked (fixed in alpha.72), and something further that
  breaks delegated interaction in two more packages, still undiagnosed. The IR path is not
  at parity with `inline`, so it should not be what an app gets by default.

  `codegen: 'ir'` remains available and is still where the newer work lives — template
  cloning, partial templates, resolution and load strategies all run through it. It becomes
  the default again once a real library passes on it.

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
