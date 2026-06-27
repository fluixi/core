---
"@fluixi/start": minor
---

Static Site Generation. Set `prerender` in `fluixi.config` and `fluixi build` renders routes to
static HTML in `dist/client` (deploy to any static host; pages hydrate on the client). `true`
prerenders `/` and crawls internal `<a href>` links; `{ routes, crawl }` sets explicit paths (for
dynamic routes with no incoming link) and toggles crawling. Each page is rendered through the real
production handler, so the static output is byte-identical to what `fluixi start` serves — assets,
`__FX_DATA__`, hydration markers and all. Also exported `prerender()` for programmatic use.
