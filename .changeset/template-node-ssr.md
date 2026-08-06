---
"@fluixi/dom": minor
"@fluixi/compiler": minor
---

Make template cloning work under SSR and hydration, and turn it back on

`templateNode(html, tag)` replaces the emitted `createTemplate`/`cloneTemplate` pair and
handles the three environments the way `createNativeElement` already does — which is the
point, since a template has to behave like the elements it replaces:

- **server** — carried as a `ServerRaw` node and serialized verbatim. Parsing the HTML
  into elements only to serialize them straight back would be pure cost.
- **hydrating** — adopts the server's existing subtree via a new `hydrateStatic` walker
  step and skips past it. The subtree is inert by construction, so there is nothing
  inside to wire up, and stepping through it element by element would only give the
  cursor more chances to desynchronise.
- **client** — parses once (cached by HTML) and clones per instance.

The module-scope declaration is now just the HTML string. It used to be a
`createTemplate(...)` call, which touched `document` at import time and broke SSR before
a single component rendered.

With that, `templateClone` defaults back to on, and the compiler's whole suite plus every
example passes under `codegen: 'ir'` as well as `inline` — including the router, SSR and
nested-hydration suites.
