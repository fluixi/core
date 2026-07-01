---
"@fluixi/dom": patch
---

`setAttribute` now removes the attribute for `null`/`undefined`/`false` instead of rendering `="undefined"`.

An `undefined`/`null` value fell through to `element.setAttribute(name, String(value))`, so a conditionally-absent attribute (`aria-orientation={cond ? 'vertical' : undefined}`, `data-pressed={dataAttr(false)}`) rendered as the literal string `"undefined"`. Since the compiler routes dynamic attributes through `setDynamicAttribute` → `setAttribute`, this hit any conditional attribute. Now, matching Solid's dom-expressions semantics: `null`/`undefined`/`false` remove the attribute, `true` sets it to the empty string, objects serialize to JSON, and everything else stringifies.
