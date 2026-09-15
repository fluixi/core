# Dependency injection

`@fluixi/start/di` provides an Angular-style injector, useful for sharing services,
clients and config without prop-drilling, with **per-request isolation** on the server.

```ts
import { injectionToken, provide, inject } from '@fluixi/start/di';

const ApiClientToken = injectionToken<ApiClient>('ApiClient');

// Provide it, e.g. at the app root:
provide([
  { provide: ApiClientToken, useFactory: () => new ApiClient(env.API_URL) },
]);

// Inject it anywhere in the owner tree:
const api = inject(ApiClientToken);
```

`provide` takes an **array** of providers, so one call registers a whole set, and returns
the injector it created.

## Tokens

A token is an identity, not a value, two tokens with the same name are still distinct,
and the type parameter is what makes `inject` return the right type.

```ts
const Config = injectionToken<AppConfig>('Config');
const Now = injectionToken<() => Date>('Now', { factory: () => () => new Date() });
```

A token with a `factory` has a default, so `inject(Now)` works with nothing provided,
useful for things that almost always have one sensible implementation and occasionally
need swapping in a test.

## Provider forms

```ts
provide([
  { provide: Config, useValue: { apiUrl: '/api' } },              // a ready value
  { provide: Clock, useClass: SystemClock },                      // constructed once
  { provide: Api, useFactory: (c) => new Api(c.apiUrl), deps: [Config] },
  { provide: LegacyApi, useExisting: Api },                       // an alias
]);
```

`deps` lists the tokens to resolve and pass, in order, to `useFactory` or the `useClass`
constructor. Everything is built **lazily** on first `inject` and then cached, so a
service nobody injects is never constructed.

A circular dependency is detected and reported rather than overflowing the stack.

## Scope

Injectors follow the reactive owner tree, so a `provide` inside a component shadows an
outer one for that subtree and disappears with it:

```ts
createRoot(() => {
  provide([{ provide: T, useValue: 'child' }]);
  inject(T);   // "child"
});
inject(T);     // back to the outer value
```

`provideRoot` registers on the root injector instead, which is what an app-wide service
usually wants. `runInInjectionContext(injector, fn)` runs `fn` against a specific
injector, needed when you have to inject from a callback that has left the owner tree.

## Per-request roots

On the server the root injector is created **per request**, so two concurrent requests
never share instances. A request-scoped service, a database connection, the current user's
session, stays isolated without any work on your part. On the client there is one root for
the life of the page.

This is the reason to prefer DI over a module-level singleton in an SSR app: a module
global is shared by every request the process handles, and leaking one user's session into
another's render is the kind of bug that only appears under concurrency.

## Cleanup

A provider can implement `onDestroy`, called when its injector is disposed, at the end of
the request on the server, or when the owning root is disposed on the client.

Next: **[Internationalization](/v1/en/i18n)**.
