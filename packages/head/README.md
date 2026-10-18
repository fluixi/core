# @fluixi/head

Built-in, **reactive, SSR-first** SEO & document-head management for Fluixi. No external library: it's a core part of the framework.

```ts
import { seo, jsonld } from '@fluixi/head';

seo({
  title: 'Home',
  titleTemplate: '%s · Fluixi',
  description: 'A fine-grained reactive framework.',
  canonical: 'https://fluixi.com/',
  og: { type: 'website', image: 'https://fluixi.com/og.png', siteName: 'Fluixi' },
  twitter: { card: 'summary_large_image', site: '@fluixi' },
  jsonLd: jsonld.website({ name: 'Fluixi', url: 'https://fluixi.com', searchUrl: 'https://fluixi.com/s?q=' }),
});
```

## What it does

- **Reactive**: pass a signal (or a function reading one) and the document updates live:
  ```ts
  const title = $signal('Dashboard');
  seo(() => ({ title: title() })); // document.title tracks the signal — no reload
  ```
- **SSR-first**: `renderHead(registry)` serializes the resolved tags into `<head>` markup plus
  `<html>` attributes; the client reconciler reuses those tags **by key** → no hydration mismatch.
- **Deduplicated**: one title, one description, one canonical; repeatable tags (extra `og:image`,
  hreflang alternates, JSON-LD) accumulate. Last write wins for singletons.
- **Nested inheritance**: register from a layout, then a page; child values override, arrays merge.
- **Typed**: every property is typed, including Open Graph, Twitter, robots, icons, verification.

## Surface

`title`, `titleTemplate`, `description`, `keywords`, `author`, `robots` (string or object),
`canonical`, `lang`, `themeColor`, `viewport`, `charset`, `generator`, `applicationName`,
`referrer`, `colorScheme`, `manifest`, **Open Graph** (incl. multiple images, video, audio,
article/book/profile), **Twitter** cards, **JSON-LD**, `alternates` (hreflang), `feeds` (RSS),
`icons` (favicon/apple/mask/shortcut/ms-tile), `verification` (google/bing/yandex/pinterest),
`base`, and `meta`/`link`/`script` escape hatches.

### JSON-LD helpers

`jsonld.organization · person · website · webPage · searchAction · article · blogPosting · faq ·
product · breadcrumb · videoObject · event · localBusiness · softwareApplication · custom`.

### Components

`<Title>`, `<Meta>`, `<Link>`, `<Script>`, `<Base>`, `<JsonLD>`: render nothing, register metadata,
work on server + client (a signal passed in updates the document live).

### Sitemap & robots

Pure generators: `generateSitemap(entries)` (lastmod / changefreq / priority / hreflang / images /
videos), `chunkSitemap` + `generateSitemapIndex` (50k splitting), and `generateRobots(opts)`
(rules / host / sitemaps, environment-aware disallow-all for previews).

## Status

This is the **engine** (Phase 1): registry + resolution/dedupe + SSR serialize + reactive client
reconcile + JSON-LD + components + sitemap/robots generators, fully tested.

Planned integrations (Phase 2): `seo` route exports + nested-layout wiring in `@fluixi/router`,
automatic `<head>` injection in the `@fluixi/server` SSR/stream pipeline, `robots.txt`/`sitemap.xml`
emission from the `@fluixi/start` build, a devtools panel, an SEO validator, and an image-metadata
pipeline.
