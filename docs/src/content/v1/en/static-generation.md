# Static generation

Set `prerender` in `fluixi.config` and `fluixi build` renders your routes to **static
HTML** in `dist/client`, deploy to any static host; the pages hydrate on the client.

```ts
// fluixi.config.ts
import { defineConfig } from '@fluixi/start/config';

export default defineConfig({
  ssr: true,
  prerender: true, // crawl from "/" following internal <a> links
});
```

`prerender` **requires `ssr: true`**, because prerendering is server rendering run at build
time rather than per request. Turning SSR off leaves nothing to render with.

This documentation site is built this way.

## Choosing what gets rendered

`prerender: true` starts at `/` and follows internal links. That covers a site whose pages
are reachable by navigation, and misses anything that is not linked, a route behind a
form, a detail page whose list is paginated, an unlisted URL.

List those explicitly:

```ts
export default defineConfig({
  ssr: true,
  prerender: { routes: ['/', '/blog/hello'], crawl: true },
});
```

`routes` is the seed list, `crawl` decides whether links found in the output are followed
as well. Set `crawl: false` to render exactly the listed routes and nothing else, which is
what you want when the set is generated from a CMS or a content directory.

A dynamic route needs one entry per concrete URL: `/blog/[slug]` is a pattern, not a page,
so `/blog/hello` and `/blog/world` are separate entries.

## What the output is

Each page is rendered through the **real production handler**, so the static output is
identical to what `fluixi start` would serve, assets, serialized data, hydration markers
and all. There is no second rendering path to drift.

That also means anything the page loads at render time is baked in at build time. A route
showing "posts from the last 24 hours" shows the 24 hours before the build, until the next
build. Data that must be current has to be fetched on the client, or the route left out of
the prerender set and served by a running server.

## What does not run

A prerendered page is a file. At request time there is no server work, which means
[middleware](/v1/en/middleware) does not run for it, and neither do server functions until
the page has hydrated and calls one. A per-request check, auth, geolocation, an A/B split,
cannot live only in middleware if the route is also prerendered.

Mixed deployments are fine: prerender the marketing pages and let the app routes be served
by `fluixi start`.

## Deploying files only

When the site goes to a static host with no server at all, say so with `static: true`:

```ts
export default defineConfig({
  ssr: true,
  prerender: { routes: ['/', '/pricing'], static: true },
});
```

The build then lists what would fail there: a link in a prerendered page to a page that was
not prerendered (the host has no file for it), and a page whose code calls a server function
(the call has no server to reach when the page is opened by client navigation). Each line
names the page, so you can add it to `routes`, load its data another way, or deploy the
server after all.

Next: **[Deployment](/v1/en/deployment)**.
