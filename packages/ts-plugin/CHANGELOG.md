# @fluixi/ts-plugin

## 1.0.0-alpha.107

### Patch Changes

- Updated dependencies [00445ed]
  - @fluixi/compiler@1.0.0-alpha.107
  - @fluixi/template-parser@1.0.0-alpha.107

## 1.0.0-alpha.106

### Patch Changes

- Updated dependencies [e71f42c]
- Updated dependencies [d0152b3]
  - @fluixi/compiler@1.0.0-alpha.106
  - @fluixi/template-parser@1.0.0-alpha.106

## 1.0.0-alpha.105

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.105
- @fluixi/template-parser@1.0.0-alpha.105

## 1.0.0-alpha.104

### Patch Changes

- Updated dependencies [da310b5]
  - @fluixi/compiler@1.0.0-alpha.104
  - @fluixi/template-parser@1.0.0-alpha.104

## 1.0.0-alpha.103

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.103
- @fluixi/template-parser@1.0.0-alpha.103

## 1.0.0-alpha.102

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.102
- @fluixi/template-parser@1.0.0-alpha.102

## 1.0.0-alpha.101

### Patch Changes

- Updated dependencies [a6841a4]
  - @fluixi/compiler@1.0.0-alpha.101
  - @fluixi/template-parser@1.0.0-alpha.101

## 1.0.0-alpha.100

### Patch Changes

- 94153dc: `@fluixi/oauth2` installs `@fluixi/auth` and `@fluixi/session` directly, so applications using `@fluixi/oauth2` may remove `@fluixi/auth` from their dependencies if it's only used for OAuth2. Its peers include `@fluixi/dom` and `@fluixi/storage`, and Fluixi packages depend on each other through `^` ranges.
- Updated dependencies [5f91c50]
- Updated dependencies [94153dc]
  - @fluixi/compiler@1.0.0-alpha.100
  - @fluixi/template-parser@1.0.0-alpha.100

## 1.0.0-alpha.99

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.99
- @fluixi/template-parser@1.0.0-alpha.99

## 0.1.0-alpha.32

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.98

## 0.1.0-alpha.31

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.97

## 0.1.0-alpha.30

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.96

## 0.1.0-alpha.29

### Patch Changes

- Updated dependencies [0b23d7d]
- Updated dependencies [6919cbc]
- Updated dependencies [06a5af9]
  - @fluixi/compiler@1.0.0-alpha.95

## 0.1.0-alpha.28

### Patch Changes

- Updated dependencies [fc31dad]
- Updated dependencies [8362b9a]
- Updated dependencies [27a74db]
- Updated dependencies [3921c35]
- Updated dependencies [232b766]
- Updated dependencies [43d46e2]
- Updated dependencies [f0b00eb]
- Updated dependencies [20ef9f9]
- Updated dependencies [97fae85]
- Updated dependencies [2daa24b]
- Updated dependencies [5de732d]
- Updated dependencies [c5f2df6]
- Updated dependencies [3cef411]
  - @fluixi/compiler@1.0.0-alpha.94

## 0.1.0-alpha.27

### Patch Changes

- Updated dependencies [501e7e5]
- Updated dependencies [1c2333c]
- Updated dependencies [aaf6521]
- Updated dependencies [36bf7d7]
- Updated dependencies [3a20e09]
- Updated dependencies [4ac7bba]
- Updated dependencies [1f60b01]
- Updated dependencies [c278b4c]
- Updated dependencies [330c257]
  - @fluixi/compiler@1.0.0-alpha.93

## 0.1.0-alpha.26

### Minor Changes

- 39a3db5: The editor now reports env and auth mistakes such as secret env names read in browser code, secrets in browser clients, unchecked audiences, weak algorithms, DPoP verifiers given bare tokens, role checks without roles, and weak session cookies.

### Patch Changes

- f4dc50c: Template diagnostics are now retained when an `env/auth` rule throws, and the failure is logged to the TypeScript server.
- 7864fb6: `@fluixi/ts-plugin/rules` exports `envAuthDiagnostics`, now usable outside tsserver.
- Updated dependencies [ae69e32]
- Updated dependencies [4933804]
  - @fluixi/compiler@1.0.0-alpha.92

## 0.1.0-alpha.25

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.91

## 0.1.0-alpha.24

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.90

## 0.1.0-alpha.23

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.89

## 0.1.0-alpha.22

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.88

## 0.1.0-alpha.21

### Patch Changes

- Updated dependencies [190493a]
- Updated dependencies [807fb8a]
  - @fluixi/compiler@1.0.0-alpha.87

## 0.1.0-alpha.20

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.86

## 0.1.0-alpha.19

### Patch Changes

- Updated dependencies [ea498ef]
  - @fluixi/compiler@1.0.0-alpha.85

## 0.1.0-alpha.18

### Patch Changes

- Updated dependencies [9565405]
- Updated dependencies [aa17d01]
- Updated dependencies [e077a97]
  - @fluixi/compiler@1.0.0-alpha.84

## 0.1.0-alpha.17

### Patch Changes

- Updated dependencies [e005759]
- Updated dependencies [f1d153c]
- Updated dependencies [e005759]
- Updated dependencies [ae9784f]
- Updated dependencies [f5b4031]
  - @fluixi/compiler@1.0.0-alpha.83

## 0.1.0-alpha.16

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.82

## 0.1.0-alpha.15

### Patch Changes

- Updated dependencies [231a169]
  - @fluixi/compiler@1.0.0-alpha.81

## 0.1.0-alpha.14

### Patch Changes

- Updated dependencies [4a30116]
- Updated dependencies [c698a5c]
  - @fluixi/compiler@1.0.0-alpha.80

## 0.1.0-alpha.13

### Patch Changes

- Updated dependencies [21a13fd]
- Updated dependencies [21a13fd]
- Updated dependencies [21a13fd]
  - @fluixi/compiler@1.0.0-alpha.79

## 0.1.0-alpha.12

### Patch Changes

- f121072: The npm descriptions no longer claim things that do not exist: Solid compatibility, an SWC compiler front-end, a language server, and a Biome plugin.
- Updated dependencies [f121072]
  - @fluixi/compiler@1.0.0-alpha.78
  - @fluixi/template-parser@0.1.0-alpha.4

## 0.1.0-alpha.11

### Patch Changes

- Updated dependencies [d93fdf3]
- Updated dependencies [56bb9b9]
- Updated dependencies [5691dc5]
  - @fluixi/compiler@1.0.0-alpha.77

## 0.1.0-alpha.10

### Patch Changes

- Updated dependencies [051fdeb]
- Updated dependencies [122e8f5]
  - @fluixi/compiler@1.0.0-alpha.76

## 0.1.0-alpha.9

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.75

## 0.1.0-alpha.8

### Patch Changes

- Updated dependencies [f995106]
- Updated dependencies [93421e8]
- Updated dependencies [8da12e6]
- Updated dependencies [b747b26]
- Updated dependencies [9817f51]
- Updated dependencies [08635bd]
- Updated dependencies [f0dd4e3]
- Updated dependencies [f2d3779]
- Updated dependencies [6e586c0]
- Updated dependencies [458f2e4]
- Updated dependencies [9817f51]
- Updated dependencies [e035c4e]
- Updated dependencies [3a9607b]
- Updated dependencies [8e1e0f4]
- Updated dependencies [0fdebdd]
- Updated dependencies [4022c74]
- Updated dependencies [33c3574]
  - @fluixi/compiler@1.0.0-alpha.74

## 0.1.0-alpha.7

### Patch Changes

- Updated dependencies [93e06ef]
- Updated dependencies [7e98158]
  - @fluixi/compiler@1.0.0-alpha.73

## 0.1.0-alpha.6

### Patch Changes

- Updated dependencies [15f7c3c]
  - @fluixi/compiler@1.0.0-alpha.72

## 0.1.0-alpha.5

### Patch Changes

- Updated dependencies [ef528ba]
- Updated dependencies [12ea3a5]
  - @fluixi/compiler@1.0.0-alpha.71

## 0.1.0-alpha.4

### Patch Changes

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

- c888e15: Re-query completions on every keystroke inside a template, and stop past `>`

  Completion lists were returned without `isIncomplete`, so the editor treated one response
  as valid for the whole word and filtered it locally rather than asking again. Inside a
  template the valid set changes with the cursor — a tag name, then that tag's props — so a
  list captured a keystroke earlier is simply the wrong one, and the props only appeared
  after enough typing to force a fresh request. That is what made completion feel
  intermittent.

  The attribute area was also end-inclusive, so props were still offered with the cursor
  already past `>`.

- 8f2fab3: Complete and describe component props for tags supplied by a `resolve` rule

  Typing `<Stack ` inside `` html`…` `` offered only the framework's generic surface —
  `class`, `.prop`, `use:` — and none of the component's own props.

  Hovering a prop name gave nothing either. Both resolved the tag by scanning the file's own top-level statements, so it
  only ever found local declarations and hand-written imports. A component supplied by a
  `resolve` rule has neither: the compiler injects its import, and TypeScript knows it
  through generated ambient declarations. They now resolve through scope, the same lookup
  hover already used — which is why hover worked on the very tag whose props did not
  complete.

  Alias declarations are followed, since generated globals are emitted as
  `export import Stack = ns.Stack` and the alias has to be resolved before the call
  signature is reachable.

- 58a0086: Keep component props in the list once you start typing

  Prop completions carried no replacement span, so the editor filtered them against the
  word it computed at the cursor — which inside a template literal isn't the attribute
  name. The props showed while the prefix was empty and vanished on the first keystroke.
  They now span the name being typed, so `dir` narrows to `direction` instead of
  emptying the list.

- 37cbf4c: Fix template offsets drifting after an escape sequence

  Spans were computed from `node.text`, the _cooked_ template value, where `` \` `` is one
  character while the source spends two. Every position after an escape was therefore
  reported short, so hover, completion and diagnostics landed on the wrong offset — and a
  tag whose attribute area had shifted out from under the cursor simply returned nothing.

  A single `` html`\`\` …` `` in a file was enough: two escapes moved the following tag two
  characters left, which reads as "autocomplete just doesn't work in this file" while
  everything looks perfectly ordinary.

  Pieces are now built from the source text. The escape stays a backslash and a backtick in
  the text a node reports, which changes nothing structural — spans are what matter here —
  and offsets line up with the file again.

- Updated dependencies [d27056f]
- Updated dependencies [77ab4cb]
- Updated dependencies [509f3f2]
- Updated dependencies [b8ef7fc]
- Updated dependencies [4f4895a]
- Updated dependencies [569fe05]
- Updated dependencies [b820700]
- Updated dependencies [2a317dc]
  - @fluixi/compiler@1.0.0-alpha.70
  - @fluixi/template-parser@0.1.0-alpha.3

## 0.1.0-alpha.3

### Minor Changes

- e53b239: Go To Definition, Find References and Rename for component tags in templates.

  A `${…}` hole is a real expression, so TypeScript already answered all three for
  it — the plugin simply wasn't forwarding those requests. The synthetic part is the
  tag name: `<UserCard>` is text inside a string literal, invisible to the checker.

  Rename is the one that mattered most. Renaming a component previously left every
  template referencing it silently broken, because nothing rewrote the tags. Both
  the opening and the closing tag are collected — rewriting `<Tag>` but not `</Tag>`
  would leave a mismatched template, which is worse than not renaming at all — and
  tag locations are only added when the ordinary rename already succeeded.

  References resolve each candidate tag through its own file's scope before being
  included, so an unrelated local component that happens to share a name is not
  swept in. Files are pre-filtered on the literal `html\`` before anything is
  parsed, so a project without templates costs one string search per file.

  Auto-imported components are covered too. `<Show>`, `<Portal>`, `<Suspense>`,
  `<Outlet>` and the rest have no import — the compiler injects one — so there is no
  binding in the file and every symbol-driven feature went quiet on precisely the
  components used most. They now resolve the way the compiler would, against the
  module it would import from. That also gives them hover, which they never had.

  Fixing hover across files exposed a bug in it: the declaration's offset was used
  to query the file being edited rather than the file the declaration is in. Harmless
  while every component was local, wrong as soon as one isn't.

  The map mirroring the compiler's sets is pinned by a test that reads the compiler
  source, so adding a component there without updating the plugin fails.

  Auto-imported components resolve even when their module isn't in the program —
  which is the normal case, since nothing importing the module is exactly what
  "auto-imported" means. Only `Suspense` appeared to work, because something else
  pulls `@fluixi/core` into the program while `@fluixi/dom` has no reason to be
  there. Definition needs a file and a span rather than the checker, so it now reads
  the declaration from disk, following `export *` through the barrels these packages
  are built from.

- 4f8056c: Offer a quick fix for the uncalled-accessor warning.

  A diagnostic you can't act on is half a feature: the rule already knows the
  remedy, so leaving it to be typed by hand is a gap, not a design. `${count}` now
  comes with "Call 'count'", and a fix-all that corrects every occurrence in the
  file in one pass.

  The plugin's fixes are appended to TypeScript's rather than replacing them, so
  nothing it would have offered is displaced. Fix-all edits are applied
  latest-first, so applying one doesn't shift the offsets of the next.

  The accessor rule now also covers `${signals[0]}` and `${state.count}`, not just a
  bare identifier — reaching an accessor by index or property is the same mistake,
  and only the identifier form was reported.

  Template diagnostics are cached on the `SourceFile`. They were recomputed for
  every quick-fix request, and the editor asks for code actions on every cursor
  move — so the analysis ran constantly rather than once per edit.

### Patch Changes

- aba07cb: Fix a crash that took down the whole TypeScript language service.

  `0.1.0-alpha.2` added shadow files to the program by patching `getScriptFileNames`,
  and built a shadow for every file inside that call. tsserver calls it on every
  project sync, so this re-entered host machinery and parsed the project on each
  call — the service died on startup and VS Code disabled it after five attempts,
  taking every JS/TS feature with it.

  The host is no longer touched at all, and the plugin still creates no language
  service. It only wraps the service it is handed.

  Hole type-checking is kept, by a different route: the expressions inside `${…}`
  are real expressions in a real file that TypeScript has already bound. The only
  thing missing is a contextual type for the callback parameter, so the plugin
  supplies the type it already infers for hover and asks the main checker whether
  each property access on that parameter holds. Errors land on real source
  positions, so nothing needs mapping.

  This reports a wrong property on an inferred parameter — `each` items, `ref`
  elements, event objects — which is the mistake templates actually produce. It is
  not a general type-check of hole contents; that needed the machinery which proved
  unsafe to run inside tsserver.

  Also reports a signal read without calling it. `${count}` in child position
  renders the function object and never updates; `${count()}` is what was meant.
  The editor already had this rule for JSX, so html`` templates lacked an
  equivalent for the same mistake.

  Scoped hard: only a bare identifier, only among the children of a native element,
  and only when its type is callable with no required arguments. A component
  legitimately receives accessors (`<For each=${items}>`) and a render-prop child is
  a function on purpose, so neither is touched.

- Updated dependencies [4b5e5fb]
  - @fluixi/template-parser@0.1.0-alpha.2

## 0.1.0-alpha.2

### Minor Changes

- 9a2d31a: Type element attributes inside html`` templates, and cache per file version.

  Completion and hover for a native element's attributes now come from
  `IntrinsicElements` in `@fluixi/dom/attributes` — the same tag → attributes map
  JSX checks against, so both authoring modes agree and neither needs the other's
  package. The editor's HTML service already offers standard attribute names from
  MDN data; what it can't know is the framework surface (`classList`, `onClick`,
  `Reactive<T>` value types), which is what this adds.

  Caching: the parsed template and the file's template list are keyed on the
  `SourceFile` object, which TypeScript replaces whenever the file changes — so a
  `WeakMap` gives exact invalidation with no version bookkeeping. Previously every
  entry point re-parsed the enclosing template and re-walked the file's AST on each
  keystroke, several times per keystroke. `IntrinsicElements` is resolved once per
  Program and attribute lists are memoised per tag.

- 5c7e2c6: Check templates on one program instead of two.

  Deep template checking ran a second `ts.LanguageService`. A second service means a
  second document registry, so `lib.d.ts` and every `node_modules` declaration — the
  expensive part — were parsed and bound twice.

  Now each file containing templates gets a shadow file added to the existing
  program: a copy of the source with html``replaced by typed helper calls. Locals
stay in scope because the shadow copies the whole file, and lib/node_modules are
parsed once because there is one program. The plugin no longer calls`createLanguageService` at all.

  The real file keeps real positions. Replacing its text — the way Volar does for
  `.vue`, where TypeScript can't read the source at all — would mean every language
  service API speaks generated coordinates, and a single unmapped one
  (`getFormattingEditsForDocument`, `findRenameLocations`) applies edits at the wrong
  offsets. Here only diagnostics explicitly requested on the shadow are mapped back.

  Shadow files are filtered out of references, rename locations, definitions,
  implementations and document highlights, and report no diagnostics of their own,
  so nothing about them reaches the editor.

## 0.1.0-alpha.1

### Minor Changes

- e183e9a: New package: a TypeScript language-service plugin that gives html`templates
real type support. Each file is mirrored to a virtual document where every` html`...` ``becomes typed helper calls embedding the`${…}` holes verbatim, so
  the JavaScript inside templates gets full inference, completion, hover, and
  error-checking — `<li each=${items}>${(it) => it.label}</li>` types `it` as the
  element of `items`; `@click=${(e) => …}`types`e` as the DOM event — with
results mapped back to the source. Also stops a component used only through a
template tag (`<UserCard/>`) from being reported "declared but never used".

### Patch Changes

- Updated dependencies [e183e9a]
  - @fluixi/template-parser@0.1.0-alpha.1
