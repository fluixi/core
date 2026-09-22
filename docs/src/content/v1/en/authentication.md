# Authentication

Three ways to sign someone in, and they share almost everything. Pick the wrong one and
you change a single function, not the app.

```
          how credentials become a token        <- only this differs
                        |
          @fluixi/session      token, user, status, refresh, roles, 401 guard
                        |
          @fluixi/auth/client  useUser, protectedRoute, Can
                        |
                     your UI
```

`@fluixi/session` owns the session state machine. `@fluixi/auth/client` owns the guards
and the reads. Neither knows how you authenticated, which is why the layer above stays
the same whichever path you take.

## Which one is yours

The deciding question is who holds the user records.

| You have | Use | Page |
| --- | --- | --- |
| Your own login page and your own database | `@fluixi/session` | [Sessions](/v1/en/session) |
| A provider's login page: Keycloak, Auth0, Okta, Curity | `@fluixi/oauth2` | [OAuth2 and OIDC](/v1/en/oauth2) |
| An app that *is* the identity system | `better-auth` with `@fluixi/auth` | below |

## What each one costs

**`@fluixi/session`.** You write the password check, the user table, the login routes and
rate limiting on them. In exchange you keep your schema and take no dependency beyond the
framework. `@fluixi/session/server` gives you the session cookie so you are not writing
crypto.

**`@fluixi/oauth2`.** No user table and no password handling, because the provider does
both. Works with any OAuth2 or OIDC provider, and in browser mode needs no server at all,
so a static single page deployment is enough. The tradeoff is that the login page is not
yours.

**`better-auth` with `@fluixi/auth`.** Account linking, two-factor, organisations and
email/password alongside SSO, all provided. It needs a database and a server, because it
creates its own user records and its own sessions even when login is delegated to a
provider.

A note on that last one, since it is easy to misread: Better Auth can delegate login to
Keycloak through its generic OAuth plugin, but the session it issues is still its own,
stored in its own database. If you want the provider to be the only identity system,
`@fluixi/oauth2` is the smaller answer.

## What stays the same

Whichever you picked, the interface layer is identical:

```tsx
import { createAuthHooks } from '@fluixi/auth/client';
import { useNavigate } from '@fluixi/start/router';

export const { protectedRoute, Can, useUser } = createAuthHooks({
  session: auth,
  navigate: { handler: useNavigate },
  loginPath: '/login',
});
```

```tsx
// a whole page, behind a role
export default protectedRoute(AdminPage, { role: 'admin' });

// one control, behind a permission
<Can perform={(p) => p.invoices.refund} fallback={null}>
  <button onClick={refund}>Refund</button>
</Can>

// who is signed in
const user = useUser();
<span>{() => user()?.email ?? 'Signed out'}</span>
```

`createAuthHooks` accepts any object with a `user()` accessor, so all three paths feed it.
`@fluixi/oauth2` goes further and returns the guards from the service itself, so an app
using it declares authentication in one file.

## Protect, protectedRoute and Can

Three guards that look similar and are not.

| | `Can` | `Protect` | `protectedRoute` |
| --- | --- | --- | --- |
| Asks | what may you do | who are you | who are you |
| Scope | one control | a section of a page | the whole page |
| When denied | renders `fallback` | renders `fallback` | navigates away |

The consequence worth knowing: `protectedRoute` means the component never runs, so a page
that fetches on mount does not fetch for someone who should not see it. `Protect` leaves
the rest of the page intact and swaps one region.

## The boundary that is not optional

Everything above decides what to **render**. None of it decides what is **allowed**.

A client can claim any role, because a client is code on someone else's machine. Read
`can(...)` as "should I show this button", never as "may this person do this". The server
re-checks on every request, and that check is what actually protects anything. See
[Token verification](/v1/en/token-verification) for the other side.

Next: **[Sessions](/v1/en/session)**.
