---
"@fluixi/compiler": minor
---

Clone static subtrees from a template instead of building them element by element

A subtree `analyzeStatic` marks inert is now serialized to HTML once, declared at module
scope as a `createTemplate`, and cloned per instance:

```js
const _tmpl$0 = createTemplate("<div class=\"card\"><h3 class=\"t\">Title</h3><p>Sub</p></div>");
const v = cloneTemplate(_tmpl$0).firstChild;
```

Previously that emitted a `createNativeElement` plus a `spread` per element, wrapped in
an IIFE. Measured in Chrome against the real `@fluixi/dom` helpers: **2.08x faster**
instantiation for a three-element row, **2.45x** for a nine-element card.

This is a runtime and parse-time win, not a transfer-size one — the old output was
repetitive enough that gzip absorbed it, and cloning is marginally *worse* compressed.

Applies to the IR path, so `html``` and `codegen: 'ir'`. Nested subtrees lowered inside
an expression have no module scope to hoist into, so their templates are inlined;
`createTemplate` caches by HTML, making that a lookup rather than a re-parse.

Deliberately excluded, because each would change what the code means:

- **SVG** — the runtime wraps SVG template HTML in an `<svg>` host and returns that
  wrapper, so cloning would hand back the wrong node.
- **Namespaced names** (`prop:value`, `attr:x`, `bool:disabled`, `on:click`) — runtime
  instructions, not HTML. `prop:value="42"` would set an attribute where a property was
  asked for.
- **Property-only names** (`innerHTML`, `value`, `checked`, `textContent`, …) —
  `innerHTML` in a template would be escaped into visible text, and `value` as an
  attribute sets the default rather than the current value.

Attribute values and text are escaped, since the string is assigned to `innerHTML`.
`CodegenResult` gains `templates`, which a host must declare the way it already declares
`imports`.
