---
"@fluixi/dom": patch
---

Fix empty reactive text duplicating on hydration. When a reactive text was empty on the client during hydration (e.g. a resource's brief loading state) while the server had rendered non-empty content there, `hydrateText('')` returned null and never adopted the server text node — so the content duplicated once the value resolved (e.g. `User #9User #9`).

An empty reactive text now adopts and clears a non-empty server text node at the cursor. Client-only insertion anchors/placeholders (which must never consume a server node) are marked with a new `anchor` flag on `createTextNode` so they still bypass the hydration walker — keeping adjacent static text (e.g. a list item's text beside a nested element) intact.
