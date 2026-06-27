# Static generation

Set `prerender` in `fluixi.config` and `fluixi build` renders your routes to **static HTML** in
`dist/client` — deploy to any static host; the pages hydrate on the client.

```ts
// fluixi.config.ts
import { defineConfig } from '@fluixi/start/config';

export default defineConfig({
  prerender: true, // crawl from "/" following internal <a> links
});
```

This documentation site is built this way.

## Explicit routes

For dynamic routes with no incoming link, list them — and toggle crawling:

```ts
export default defineConfig({
  prerender: { routes: ['/', '/blog/hello'], crawl: true },
});
```

Each page is rendered through the **real production handler**, so the static output is identical to
what `fluixi start` would serve — assets, serialized data, hydration markers and all.

Next: **[Dependency injection](/v1/en/dependency-injection)**.
