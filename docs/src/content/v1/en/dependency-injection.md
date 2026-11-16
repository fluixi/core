# Dependency injection

`@fluixi/di` shares services, clients and configuration without passing them through props. It
works like Angular's injector, with two differences that matter in a server-rendered app: the
root injector is **one per request on the server**, so no user's state leaks into another's
render, and the component hierarchy is the **reactive owner tree**, so a component's services
are released when it unmounts.

```ts
import { injectionToken, provideRoot, inject } from '@fluixi/di';

const Api = injectionToken<ApiClient>('Api');

provideRoot([{ provide: Api, useFactory: () => new ApiClient(env.API_URL) }]);

function Tickets() {
  const api = inject(Api);
  // ...
}
```

## Which import

- **Packages** (a component library, an SDK, shared elements) import `@fluixi/di` and list it as
  a peer dependency. They then depend on the injector only, not on the meta-framework.
- **Apps** built with `@fluixi/start` can import `@fluixi/start/di`, which re-exports
  `@fluixi/di` as it is. Bundlers keep only what is used.

Both resolve to the same injectors: a service an app provides is found by a package's `inject()`.

## Tokens

A token is an identity, not a value: two tokens with the same name are still distinct, and the
type parameter is what makes `inject` return the right type.

```ts
const Config = injectionToken<AppConfig>('Config');
```

A token with a `factory` provides itself where it is first needed, so `inject` works with
nothing provided. A provider on the way still takes precedence, which is how a test swaps it.

```ts
const Now = injectionToken('Now', { factory: () => () => new Date() });
const Pool = injectionToken('Pool', { factory: () => createPool(), scope: 'platform' });
```

The factory builds once per root by default (per request on the server, per app in the
browser), or once per process with `scope: 'platform'`. A service nobody injects is never built.

## Provider forms

```ts
provideRoot([
  { provide: Config, useValue: { apiUrl: '/api' } },                // a ready value
  { provide: Clock, useClass: SystemClock },                        // constructed once
  { provide: Api, useFactory: (c) => new Api(c.apiUrl), deps: [Config] },
  { provide: LegacyApi, useExisting: Api },                         // an alias
]);
```

`deps` lists what to resolve and pass, in order, to the factory or the constructor. A
dependency can carry options: `deps: [Store, { token: Logger, optional: true }]`.

A class or factory can also call `inject()` itself. It resolves from the injector that **holds
the provider**, not from wherever the service was first asked for:

```ts
class CheckoutService {
  #payments = inject(Payments);
  #log = inject(Logger, { optional: true });
}
```

Everything is built lazily on first request, then reused by that injector.

### Multi providers

`multi: true` contributes one value to a list instead of replacing the token's value. Interceptors,
plugins and validators are the usual case:

```ts
const Interceptors = injectionToken<Interceptor[]>('Interceptors');

provideRoot([
  { provide: Interceptors, useValue: authInterceptor, multi: true },
  { provide: Interceptors, useValue: retryInterceptor, multi: true },
]);

inject(Interceptors); // [authInterceptor, retryInterceptor], in registration order
```

A component that provides its own `multi` values for the token gets its own list; it does not
extend the outer one.

## The hierarchy

| Injector | Created by | Lives |
|---|---|---|
| platform | `providePlatform()`, `scope: 'platform'` tokens | the whole process |
| root | `provideRoot()`, app modules, `scope: 'root'` tokens | one request on the server, the page in the browser |
| component | `provide()` inside a component | until the component unmounts |
| standalone | `createInjector()` | until you call `dispose()` |

`inject()` resolves from the current context: an explicit injector (below), else the nearest
component injector up the owner tree, else the root, then the platform, then the token's own
factory.

```ts
function Editor() {
  provide([{ provide: Draft, useClass: DraftStore }]);   // this editor's draft only
  return <EditorBody />;                                 // inject(Draft) inside finds it
}
```

### Choosing a scope

- **`provideRoot`**: one instance for the app. A session, a logger, an API client. Created per
  request on the server, once per page in the browser.
- **`provide` in a component**: the value belongs to what is on screen. A draft reply, a
  wizard's partial state, an editor buffer. Released with the component.
- **`providePlatform`**: costly to create and safe to share between users. A connection pool,
  parsed settings. Never per-user state.
- **A plain module export**: no lifetime and no per-request identity. Pure functions, constants.

To choose between root and component, ask what should happen when the user navigates away: kept
means root, thrown away means component. `examples/ticket-desk/src/routes/tickets/[id].tsx`
provides a `DraftStore` on the component, so a half-written reply does not follow you to the
next ticket.

## Resolution options

`inject(token, options)` and `deps` entries take:

| Option | Effect |
|---|---|
| `optional` | `null` instead of an error when nothing provides the token |
| `self` | look only in the current injector |
| `skipSelf` | start with the parent: read what an ancestor provides while providing the same token below |
| `host` | stop at the nearest component injector |

```ts
const parentForm = inject(FormGroup, { skipSelf: true, optional: true });
```

## Lifecycle

When an injector is disposed (a component unmounting, a server request ending, `dispose()` on
one you created), it releases what it built:

1. hooks registered on its `DestroyRef`, latest first;
2. the `onDestroy()` method of each service it built, latest built first.

```ts
import { DestroyRef, inject } from '@fluixi/di';

class Poller {
  #timer = setInterval(() => this.poll(), 5_000);
  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.#timer));
  }
}
```

`onDestroy` returns a function that unregisters the hook. A hook that throws is logged and the
others still run.

## App initializers

Work that must finish before the app renders goes in an initializer. They run in registration
order, each awaited; the first that fails stops the rest.

```ts
import { provideAppInitializer, provideRoot, inject } from '@fluixi/di';

provideRoot([
  provideAppInitializer(async () => {
    await inject(Settings).load();
  }),
]);
```

## Per-request roots

On the server the root injector is created per request, so two concurrent requests never share
instances, and it is disposed when the request ends: services release connections and timers
then. In the browser there is one root for the life of the page.

This is the reason to prefer DI over a module-level singleton in a server-rendered app: a module
global is shared by every request the process handles, and one user's session leaking into
another's render is a bug that only appears under concurrency.

## Where `inject()` does not work

`inject()` reads the current injection context, which does not exist in three places. There it
throws "inject() called outside an injection context" rather than guess:

1. **Module scope.** A call at the top of a file runs before any component or request. Provide
   there; inject inside components and services.
2. **After an `await`.** A component's context is synchronous. Resolve everything before the first
   `await`: after it, the component's own providers are out of reach. On the server a request
   stays a context across awaits, so code in a request still resolves from that request's root,
   but never from a component's providers.
3. **A callback that outlived its owner.** An interceptor, a `setTimeout`, a listener added
   outside a component. Keep the injector while the context exists and run the callback in it:

```ts
const injector = inject(INJECTOR);
socket.on('message', () => runInInjectionContext(injector, () => inject(Inbox).add()));
```

`isInInjectionContext()` tells whether a context is active, and
`assertInInjectionContext('useCart')` gives your own helpers a clear error.

## Errors

A missing provider or a cycle throws an `InjectionError` naming the whole resolution path, so the
missing piece can be told apart from what needed it:

```
No provider for "ApiKey" (Checkout → Payments → ApiKey).
Circular dependency: A → B → A.
```

`error.path` holds the same chain as an array.

## Server functions and DI

A `"use server"` function runs inside the request, and `inject()` there resolves from that
request's root injector. Two users calling the same function at the same moment get two
different instances of a root service. `examples/ticket-desk/src/actions.ts` injects
`TicketRepoToken` inside a server function; `tests/di.spec.ts` checks two concurrent requests
never see each other's tickets. Inject before the first `await`.

## DI is not how a server render learns who is signed in

Middleware writes the user to the request's locals (`getRequestLocals(request)`), and the render
reads them with `getLocals()`; `@fluixi/auth`'s hooks already read from there. DI decides which
instance of a service to use; locals carry what middleware learned about the request.

## Testing

`@fluixi/di/testing` builds injectors for tests, separate from the main entry so no app ships it.

```ts
import { createTestInjector, resetInjection } from '@fluixi/di/testing';

afterEach(() => resetInjection());

it('charges the cart total', async () => {
  const payments = { charge: vi.fn() };
  const injector = createTestInjector({
    providers: [{ provide: Checkout, useClass: CheckoutService }],
    overrides: [{ provide: Payments, useValue: payments }],
  });
  await injector.get(Checkout).pay();
  expect(payments.charge).toHaveBeenCalled();
});
```

`createTestInjector` builds a root of its own, without the app's providers. `overrides` replace a
token wherever it would be provided, its own factory included, until `resetInjection()`, which
also disposes what was built.

Next: **[Internationalization](/v1/en/i18n)**.
