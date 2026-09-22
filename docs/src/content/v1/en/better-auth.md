# Better Auth

`@fluixi/auth` integrates [Better Auth](https://better-auth.com), for an app that *is* the
identity system: its own user table, account linking, two-factor, organisations, and
email/password alongside social sign-in.

Better Auth owns the users, the sessions and the routes. `@fluixi/auth` connects it to
Fluixi: a middleware that resolves the session per request, a handler to mount, and the
same hooks the other two approaches use.

This is the heaviest of the three approaches, and the right one when you want a user table
you control. If a provider should be the only identity system, [OAuth2](/v1/en/oauth2) is
smaller. If you want to write the login yourself, [Sessions](/v1/en/session) is smaller
still.

## Installing

`better-auth` is a peer dependency, so you choose the version:

```bash
npm i @fluixi/auth better-auth
```

It needs a database. Follow Better Auth's own setup for the adapter and schema; this page
covers only the Fluixi side.

## The server

Create the Better Auth instance as its documentation describes, then hand it to
`defineAuth` once:

```ts
// src/lib/auth.server.ts
import { betterAuth } from 'better-auth';
import { defineAuth } from '@fluixi/auth/server';

export const auth = defineAuth(
  betterAuth({
    database: /* your adapter */,
    emailAndPassword: { enabled: true },
    socialProviders: {
      github: { clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! },
    },
  }),
);
```

`defineAuth` registers the instance so the middleware and the route handler can find it,
and returns a small wrapper:

```ts
auth.raw          // the Better Auth instance, for anything not wrapped
auth.handler      // mount at /api/auth/*
auth.getSession   // resolve the session for a request
```

### Mounting the routes

Better Auth serves its own endpoints for sign-in, sign-up, sign-out, OAuth callbacks and
the rest. Give it the catch-all:

```ts
// src/api/auth/[...all].ts
import { mountAuthRoutes } from '@fluixi/auth/server';

const handler = mountAuthRoutes();

export const GET = handler;
export const POST = handler;
```

A built server dispatches to `src/api` only when the server entry re-exports the handlers,
so make sure this line is present:

```ts
// src/entry-server.ts
export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';
```

Generated apps ship it, and a build fails with a message naming the line if it is missing.

### The middleware

```ts
// src/middleware.ts
import { defineMiddleware } from '@fluixi/start';
import { authMiddleware } from '@fluixi/auth/server';
import './lib/auth.server.js';   // so defineAuth has run

export default defineMiddleware([authMiddleware()]);
```

`authMiddleware` resolves the session and puts it on request locals under the key the
client hooks read. That is what makes `useUser()` answer during a server render instead of
filling in after hydration, and what lets a guard refuse a page before any markup is
produced.

Importing the module that calls `defineAuth` matters. Without it the middleware has no
instance to ask.

## The client

```ts
// src/lib/auth.ts
import { createAuthClient } from 'better-auth/client';
import { createAuthHooks } from '@fluixi/auth/client';
import { useNavigate } from '@fluixi/start/router';

const client = createAuthClient({ baseURL: '/api/auth' });

export const { protectedRoute, Can, Protect, useUser, useAuth, useSignIn, useSignOut } =
  createAuthHooks({
    client,
    navigate: { handler: useNavigate },
    loginPath: '/login',
    homePath: '/dashboard',
  });
```

Note `client` rather than `session`. `createAuthHooks` takes either: a Better Auth client,
or any reactive session such as the one `@fluixi/session` or `@fluixi/oauth2` produce. That
is why the pages that follow this one describe the same guards.

### Signing in

```tsx
export default function Login() {
  const signIn = useSignIn();
  const email = signal('');
  const password = signal('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); void signIn({ email: email(), password: password() }); }}>
      <input type="email" value={email()} onInput={(e) => email.set(e.currentTarget.value)} />
      <input type="password" value={password()} onInput={(e) => password.set(e.currentTarget.value)} />
      <button type="submit">Sign in</button>
    </form>
  );
}
```

Unlike the OAuth2 flow, the form is yours and the credentials go to your own server. Better
Auth checks them, creates the session and sets its cookie.

### Reading and guarding

Identical to the other approaches:

```tsx
export default protectedRoute(Dashboard);
export default protectedRoute(AdminPage, { role: 'admin' });

const user = useUser();
<span>{() => user()?.email ?? 'Signed out'}</span>

const signOut = useSignOut();
<button onClick={() => signOut()}>Sign out</button>
```

## Social sign-in

Configure the provider on the Better Auth instance, then start the flow through its
client. Better Auth handles the redirect and the callback on its own routes, so there is
no callback page to write:

```ts
await client.signIn.social({ provider: 'github', callbackURL: '/dashboard' });
```

The session that results is Better Auth's, stored in your database, with a user record
linked to the GitHub account. That is the difference from `@fluixi/oauth2`, where the
provider remains the only identity system and nothing is stored locally.

## Roles

Better Auth puts a `role` on the user when you configure one. The hooks read it without
extra config:

```ts
useAuth().roles();   // ['admin'], from user.role
```

For a richer permission model, give `createAuthHooks` a session whose `can` you control,
or derive permissions in your own code. The RBAC helpers on
[Sessions](/v1/en/session#roles-and-permissions) describe the shape.

As everywhere, a role on the client decides what to render. Better Auth's server-side
checks decide what is allowed.

## Server-side reads

Inside a server function or an API route, ask the instance directly rather than the hooks:

```ts
import { getAuth } from '@fluixi/auth/server';

export async function GET(request: Request) {
  const { user } = await getAuth().getSession(request);
  if (!user) return new Response(null, { status: 401 });

  return Response.json(await ordersFor(user.id));
}
```

When `authMiddleware` has already run, the same session is on request locals, so a render
reads it without a second lookup.

## Choosing between this and the others

| | Better Auth | `@fluixi/oauth2` | `@fluixi/session` |
| --- | --- | --- | --- |
| User records | yours, in your database | none, the provider holds them | yours |
| Sessions | Better Auth's | yours | yours |
| Login page | yours | the provider's | yours |
| Needs a database | yes | no | yes |
| Needs a server | yes | no, in browser mode | for the cookie |
| Account linking, 2FA, orgs | provided | no | write it |

Better Auth can delegate login to Keycloak through its generic OAuth plugin, but the
session it issues is still its own. Running it purely to broker a provider login means two
identity stores where one would do.

Next: **[Token verification](/v1/en/token-verification)**.
