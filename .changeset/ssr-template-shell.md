---
"@fluixi/start": patch
---

Render into the shell, not into the prerendered home page.

`dist/client/index.html` is both the SSR template and the path a prerendered `/` is
written to, so an app that prerenders its home page rendered every SSR response into
that page: two mount elements in one document, the home page's head on every route,
and hydration adopting the wrong one. The build now stashes the shell as
`dist/server/template.html` before prerendering overwrites it, and both the Node
handler and the deploy adapters read that when it exists.
