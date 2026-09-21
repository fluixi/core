---
"@fluixi/dom": patch
"@fluixi/compiler": patch
---

A binding on a custom element sets the property even when the element has not upgraded yet. `key in element` is false until `customElements.define` runs, so a page rendered before its element registered sent every value to an attribute and an object arrived as `[object Object]`, with nothing assigning the property once the element upgraded. The global attributes (`id`, `class`, `slot`, `title`, `aria-*`, `data-*` and the rest) still go to attributes. The compiler marks a dash tag while compiling, so the runtime is told rather than reading the tag back off the node.
