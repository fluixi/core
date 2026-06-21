---
"@fluixi/dom": patch
---

Fix hydration duplicating native children that follow a void element when passed
through a component. `hydrateElement` descended into a void element's (null)
`firstChild`, stranding the cursor so the next sibling — e.g. the `<button>` after
an `<input>` in `<Form><input/><button/></Form>` — was rebuilt fresh and appended.
Void elements (`input`, `br`, `img`, …) now ascend to `nextSibling` instead of
descending. This was the last bug gating default auto-hydration of SSR'd apps.
