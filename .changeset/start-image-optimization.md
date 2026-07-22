---
"@fluixi/start": minor
---

Add on-demand image optimization. `createImageHandler(options)` returns a
Web `Request` → `Response` handler you mount as an API route: it resizes and
re-encodes images (AVIF/WebP by `Accept` negotiation), with a target-width
allow-list, remote-domain allow-listing + local path-traversal guards, immutable
cache headers, and a small in-memory cache. The codec is pluggable — it uses
`sharp` when installed, otherwise streams the source through unchanged, so
`@fluixi/start` never hard-depends on a native module. `imageLoader({ path })`
produces a matching loader for `@fluixi-ui/image`'s `loader` prop.
