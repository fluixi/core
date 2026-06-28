---
"@fluixi/core": minor
"@fluixi/start": patch
"@fluixi/create": patch
---

Flash-free hydration for lazy file-routes — preload the route chunk before hydrating.

A server-rendered app with code-split file-routes used to render twice on hydration: the lazy boundary rendered empty on the first pass (chunk not loaded), then re-rendered when the chunk resolved a tick later — building a fresh subtree next to the server DOM instead of adopting it. The app flashed and, with auto-hydration on, duplicated.

Now the matched route's chunk is downloaded and awaited *before* hydration, so each lazy route resolves synchronously on the first pass and adopts the server DOM in place.

- `lazy()` renders synchronously once its module is resolved (no resource/Suspense/late re-render); a cold client-side navigation still suspends and shows the fallback.
- New `preloadRoutes(routes, pathname)` (`@fluixi/core/router-next`, re-exported by `@fluixi/start/router`): matches the URL and preloads the matched route's lazy chunks.
- `startClient` takes a `routes` option and awaits `preloadRoutes` before hydrating. Passing `routes` also enables auto-hydration of a server-rendered (non-empty) root — flash-free with no extra config. Apps without it keep the plain client-render path.

```ts
// entry-client.ts
import App, { appRoutes } from './app';
startClient(App, { root: '#root', routes: appRoutes });
```

The SSR scaffold (`create-fluixi`) wires this up and ships a small `seo()` example in the index route.
