# @fluixi/di

Dependency injection for Fluixi: typed tokens, hierarchical injectors on the reactive owner tree,
one root injector per request on the server, multi providers, resolution options, lifecycles and
test overrides.

```sh
pnpm add @fluixi/di
```

```ts
import { injectionToken, provideRoot, inject } from '@fluixi/di';

const Api = injectionToken<ApiClient>('Api');
provideRoot([{ provide: Api, useFactory: () => new ApiClient(env.API_URL) }]);

function Tickets() {
  const api = inject(Api);
}
```

Packages import `@fluixi/di` and declare it as a peer dependency. Apps built with
`@fluixi/start` may import `@fluixi/start/di`, which re-exports this package.

| Export | Purpose |
|---|---|
| `injectionToken` | a typed token, optionally self-providing (`factory`, `scope`) |
| `inject` | resolve from the current context, with `optional`, `self`, `skipSelf`, `host` |
| `provide` | services for a component and its descendants |
| `provideRoot` | services for the app: per request on the server, per page in the browser |
| `providePlatform` | services for the whole process |
| `provideAppInitializer`, `runAppInitializers` | work that finishes before the first render |
| `DestroyRef`, `INJECTOR` | an injector's lifecycle, and the injector itself |
| `runInInjectionContext`, `isInInjectionContext`, `assertInInjectionContext` | the injection context |
| `createInjector`, `Injector` | injectors of your own |
| `InjectionError` | thrown with the full resolution path |

Tests import `createTestInjector` and `resetInjection` from `@fluixi/di/testing`.

Documentation: [Dependency injection](https://docs.fluixi.com/v1/en/dependency-injection).

## License

MIT
