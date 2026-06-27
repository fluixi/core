# Dependency injection

`@fluixi/start/di` provides an Angular-style injector — useful for sharing services, clients and
config without prop-drilling, with **per-request isolation** on the server.

```ts
import { injectionToken, provide, inject } from '@fluixi/start/di';

const ApiClient = injectionToken<ApiClient>('ApiClient');

// provide it (e.g. at the app root):
provide(ApiClient, { useFactory: () => new ApiClient(env.API_URL) });

// inject it anywhere in the owner tree:
const api = inject(ApiClient);
```

## Per-request roots

On the server the root injector is created **per request**, so two concurrent requests never share
instances — a request-scoped service (a DB connection, a user session) stays isolated. On the
client it's a singleton.

Providers support `useValue`, `useClass`, `useFactory(deps)` and `useExisting`, with circular-
dependency detection and an `onDestroy` lifecycle.

Next: **[Internationalization](/v1/en/i18n)**.
