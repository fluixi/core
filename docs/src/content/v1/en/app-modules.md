# App modules

What an app provides is declared once, in `src/app.config.ts`. `@fluixi/start` registers it
before either entry runs, so `entry-client` and `entry-server` stay free of setup and cannot
disagree about it.

```ts
// src/app.config.ts
import { defineApp } from '@fluixi/start/app';
import { AuthModule } from './services/auth.js';

export default defineApp({ imports: [AuthModule] });
```

Without it, a root provider had to be registered in both entries. Forgetting the server one is
silent: the server render throws, falls back to the client, and the page is only slower.

## Modules

A module is a named list of what a feature needs:

```ts
import { defineModule } from '@fluixi/start/app';
import { injectionToken } from '@fluixi/start/di';

export const Clock = injectionToken<() => Date>('Clock');

export const ClockModule = defineModule({
  name: 'clock',
  providers: [{ provide: Clock, useValue: () => new Date() }],
});

export const ReportsModule = defineModule({
  name: 'reports',
  imports: [ClockModule],
  providers: [],
});
```

`imports` are registered first, and each module once, however many modules import it. A cycle
is an error that names the modules in it. The app's own `providers` come last, so they override
a module's. Everything lands in the root injector: one instance in the browser, one per request
on the server (see [Dependency injection](/v1/en/dependency-injection)). A module is not a
scope. For services scoped to part of the page, call `provide()` in a component.

A package can ship a module, which is the point of them: `authModule` from `@fluixi/oauth2`
makes an app's auth service injectable in one line. See [OAuth2](/v1/en/oauth2).

## The server half

`src/app.config.server.ts` is the same shape and is registered on the server alone:

```ts
// src/app.config.server.ts
import { defineApp } from '@fluixi/start/app';
import { authServer } from './services/auth.server.js';

export default defineApp({ imports: [authServer()] });
```

It is a separate file because of what a browser build does with a reference. Server code named
from `app.config.ts`, even through a lazy `import()`, is emitted as a chunk in `dist/client`,
published whether it ever runs or not. Only the server build imports this file.

A module can carry `middleware`. It runs before `src/middleware.ts`, modules in `imports` order.
Middleware only runs on the server, so a module with middleware belongs here; listed in
`app.config.ts`, it warns in development.

## `.server` files

Any file named `*.server.*` is server only. The browser build fails if app code imports one,
naming the file that did, and a lazy `import()` counts:

```text
src/routes/login.tsx imports src/services/auth/verify.server.ts into the browser bundle.
```

Put a token verifier, a database client or anything reading a secret in a `.server` file, and
the mistake of importing it into a page stops the build instead of shipping. A file whose first
statement is `"use server"` is allowed: the browser gets calls to the server, not the code.
Dependencies in `node_modules` are not checked.

Next: **[Environment variables](/v1/en/environment)**.
