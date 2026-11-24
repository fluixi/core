# @fluixi/di

## 1.0.0-alpha.113

## 1.0.0-alpha.112

## 1.0.0-alpha.111

## 1.0.0-alpha.110

### Patch Changes

- 8fd12ef: An app initializer registered after the page started rendering now warns in dev even when `@fluixi/di` is first loaded by a route; before, it never ran and nothing said so.

## 1.0.0-alpha.109

### Patch Changes

- 3bf7cb2: `provideAppInitializer` now runs before the app renders, executing per request on the server and once in the browser before hydration, and `beforeFirstRender` tasks are run once per request or page.
- 15004e4: `inject()` now throws a clear error when called outside an injection context, and app initializers now run in the root injection context as documented.
- 97d105d: `inject()` in middleware now creates a separate root injector for each request that is disposed when the response is ready, and `requestScope()` and `endRequestScope()` are added to `@fluixi/dom`.
- c530572: The library now builds with mix-builder 0.4.3, sharing chunks across ES module entries so each module and its state appears only once and the published ES module files are 50-80 % smaller, with CDN globals using a single copy of the signal graph.

## 1.0.0-alpha.108

## 1.0.0-alpha.107

## 1.0.0-alpha.106

## 1.0.0-alpha.105

## 1.0.0-alpha.104

## 1.0.0-alpha.103

## 1.0.0-alpha.102

## 1.0.0-alpha.101

## 1.0.0-alpha.100

## 1.0.0-alpha.99

### Minor Changes

- 4ec5021: The new `@fluixi/di` package provides typed tokens with factory and scope, useValue/useClass/useFactory/useExisting and multi providers, optional/self/skipSelf/host injection options, constructor injection from the holding injector, detailed `InjectionError` with resolution path, `DestroyRef` and `INJECTOR`, `providePlatform`, request-root disposal, `provideAppInitializer` and `runAppInitializers`, `isInInjectionContext` and `assertInInjectionContext`, and the testing utilities `createTestInjector` and `resetInjection` in `@fluixi/di/testing`.

### Patch Changes

- 3ed276b: Fluixi peer dependencies are published as ^ ranges (^1.0.0-alpha.N) instead of exact versions.
