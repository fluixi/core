---
"@fluixi/start": minor
---

Dependency injection + SPA mode — `@fluixi/start` now covers the full app architecture.

**`@fluixi/start/di` — dependency injection, Angular-style but SSR-correct + reactive.**

```ts
import { injectionToken, inject, provide, provideRoot } from '@fluixi/start/di';

const Logger = injectionToken<Logger>('Logger', { factory: () => new ConsoleLogger() });
class UserService { #log = inject(Logger); }            // function injection — no decorators
const Users = injectionToken('Users', { factory: () => new UserService() });

// component / route / server function:
const users = inject(Users);
provide([{ provide: Theme, useClass: DarkTheme }]);     // owner-scoped, disposed on unmount
provideRoot([{ provide: Db, useFactory: () => new Db() }]);
```

- `useValue` / `useClass` / `useFactory` (with `deps`) / `useExisting`; tree-shakable token
  `factory` (≈ `providedIn: 'root'`); circular-dependency detection; `onDestroy()` lifecycle.
- **The reactive owner tree IS the injector hierarchy** — `provide()` attaches a child
  injector to the component's owner; `inject()` walks it; it disposes with the component.
- **SSR request isolation, for free** — a "root" service is a singleton on the client but a
  FRESH instance per request on the server (the root injector lives in the per-request
  context), so stateful root services never leak across concurrent SSR requests.
- `runInInjectionContext` to resolve outside a component (e.g. inside a server function).
- Client-safe (imports only `@fluixi/core` + `@fluixi/dom`'s pure `getRequestContext`).

**SPA mode — one toolchain for SPA *and* SSR apps.** `defineConfig({ ssr: false })` serves the
static shell and lets the client render, while keeping the full @fluixi/start server: file
routing, middleware, env loading, and `/_server` server functions. Same app code either way —
flip the flag to choose where first paint happens. `dev`/`build`/`start` all honor it (a SPA
without a server entry skips the server bundle; with one, server functions still work).
