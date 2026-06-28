---
'@fluixi/head': minor
'@fluixi/start': minor
---

New `@fluixi/head` — built-in reactive, SSR-first SEO/document-head engine. Typed title/meta/OG/Twitter/JSON-LD/canonical/hreflang/icons/verification, last-wins dedupe with nested layout inheritance, SSR serialize + client reconcile (reuses server tags by key, no hydration mismatch, signals update the document live), JSON-LD helpers, head components, and robots.txt/sitemap.xml generators.

Re-exported as `@fluixi/start/head` (same pattern as `@fluixi/start/router`) so apps have one import surface.
