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

## Choosing a scope

- **provideRoot**, use when there is exactly one instance for the whole app, such as a session, a logger, or an API client. On the server this instance is created per request; on the client it lives for the lifetime of a page.  
- **provide inside a component**, use when the value belongs to what is on screen, for example a draft reply, a wizard's partial state, or an editor buffer. The value is disposed with the component, and `onDestroy` runs.  
- **plain module export**, use when the value has no lifetime and no per-request identity, such as pure functions, constants, or a date formatter.  

**Test for root vs component**, ask what should happen when the user navigates away. If the value should survive, choose root; if it should be thrown away, choose component.  

**Worked example**, `examples/ticket-desk/src/routes/tickets/[id].tsx` provides a `DraftStore` on the component, so a half-written reply does not follow you to the next ticket. Using root scope there would leak one ticket's draft onto another.

## Where `inject()` does not work

`inject()` reads the current injection context. There are three places where no context exists:

1. **Module scope**, a call at the top of a file runs before any component, so there is no owner and no request. This is why a service is provided from the client entry and read inside components.  
2. **After an `await`**, the injection context is synchronous; it is restored the moment the calling frame returns. `inject()` in an async function after the first `await` throws "No provider". Resolve everything before the first `await`. Real example: an API route handler awaited `request.json()` before injecting its repository, found no context, and fixed it by injecting first.  
3. **A callback that outlived its owner**, e.g., a fetch interceptor, a `setTimeout`, or an event listener registered outside a component. Capture the injector with `getInjector()` while the context still exists, then run `runInInjectionContext(injector, fn)` later.

## Server functions and DI

A `"use server"` function runs per request on the server, and `inject()` inside it resolves from that request's root injector. Two users calling the same server function at the same moment receive two different instances of a root-provided service.  

**Worked example**, `examples/ticket-desk/src/actions.ts` injects `TicketRepoToken` inside a server function; `tests/di.spec.ts` asserts that two concurrent requests never see each other's tickets.  

The same synchronous rule from the previous section applies: inject before the first `await`.

## DI is not how a server render learns who is signed in

A common mistake is to use a module-level session object as client state. On the server it is never populated, so reading it during a server render returns `null` rather than the visitor. The correct path uses request locals: middleware writes the user with `getRequestLocals`, the render reads it with `getLocals`, and `@fluixi/auth`'s hooks already read from there. DI decides which instance to provide; locals carry the data that middleware learned about the request.

Next: **[Internationalization](/v1/en/i18n)**.
