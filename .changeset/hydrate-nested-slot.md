---
"@fluixi/dom": patch
---

A page rendered blank after hydration when a route layout returns a fragment with a sibling beside a `<Show>` whose content contains another `<Show>`, because the elements the nested `<Show>` adopted from the server were not counted as adopted and were removed.
