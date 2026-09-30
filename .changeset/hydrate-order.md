---
"@fluixi/dom": patch
---

Hydration now adopts server nodes in document order when a component's children mix a lazy memo (`<Show>`) with plain siblings, preventing duplicated or rebuilt inputs and buttons in hydrated forms.
