---
"@fluixi/start": patch
"@fluixi/core": patch
---

Reference a route's own chunk and stylesheet in the document that renders it.

A lazily-imported route is its own chunk with its own CSS, and neither was mentioned
anywhere in the shell. The browser learned they existed only once hydration ran the
dynamic import, so the route's markup painted before its styles arrived and the chunk
was fetched a round trip later than it could have been.

`fluixi build` now resolves each route to the files it compiles into — that is what
Vite's SSR manifest was being generated for, and nothing had ever read it — and writes
a URL-pattern map to `dist/server`. The handler looks the path up and emits
`modulepreload` and `stylesheet` links into the head; deploy adapters inline the same
map, since a worker cannot read it. The manifest itself is no longer published: it maps
every source path to its chunk, which is not something a CDN needs to serve.

Every part of it is optional. An app with no file routes, a path that matches nothing,
or a build from before this existed yields no links and an unchanged page.

`@fluixi/core/plugins` exports `scanRoutes`, so the build resolves routes with the same
scanner the plugin uses instead of a second copy of the conventions.
