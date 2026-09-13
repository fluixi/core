---
"@fluixi/jsx": patch
---

The global JSX namespace now declares each name once, and JSX.IntrinsicElements correctly carries the element types, with JSX.Element being an alias for what the DOM can insert. Before this, `<div>` was "Property 'div' does not exist" in every application, and no editor could complete an element or an attribute.
