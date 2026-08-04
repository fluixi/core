# @fluixi/ts-plugin

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
