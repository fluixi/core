---
"@fluixi/ts-plugin": minor
---

Type element attributes inside html`` templates, and cache per file version.

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
