# Auth flow debugger

One app against five OAuth2 providers, showing what each hands back.

```
pnpm --filter @fluixi/example-auth-debugger dev
```

Then open http://localhost:3100.

## What it shows

Pick a provider and a place for the tokens to live, sign in, and the page reports:

- the access token: JWT or opaque, its claims, when it expires, counting down
- which claims name the calling client, which is the thing that differs most between
  providers
- the user, as `fetchUser` resolved it
- what the provider's discovery document publishes, so a button appears only where the
  endpoint behind it exists
- a log of what each action did, including what a provider said when it refused

Refresh, introspection, revocation and sign out are buttons. Introspection goes through
`src/api/introspect.ts`, because an RFC 7662 endpoint authenticates its caller and those
credentials belong on a server.

## The providers

`src/lib/providers.ts` holds all five. Keycloak and Dex carry working values for a local
container; the three hosted ones carry placeholders, which the interface reports as
`needs setup` rather than following.

Each provider also carries notes on what it does differently, shown beside its result, so
a known limitation reads differently from a surprise.

| | Keycloak | Dex | Auth0 | Okta | Google |
| --- | --- | --- | --- | --- | --- |
| Browser-held tokens | yes | yes | yes | yes | **no** |
| Server-held tokens | yes | yes | yes | yes | yes |
| Introspection | yes | yes | no | yes | no |
| Revocation | yes | **no** | yes | yes | yes |
| Names the client | `azp` | **neither** | `azp` | **neither** | `azp` |

Google lists one mode because it refuses a public client at its token endpoint, answering
`client_secret is missing.` before it looks at PKCE.

## Running the local providers

Keycloak:

```
docker run -d --name keycloak -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:26 start-dev
```

A realm, a public client with `http://localhost:3100/callback` among its redirect URIs,
and a user. Dex needs a config file with the same URI and a bcrypt password hash; see
`packages/oauth2/conformance/README.md`, which covers the same ground for the
non-interactive suite.

## Not every provider lets a page read its discovery document

A browser-held client resolves endpoints from `.well-known/openid-configuration`, and that
is a cross-origin read the provider has to permit. Measured here:

| | sends `Access-Control-Allow-Origin` |
| --- | --- |
| Keycloak | yes, once the origin is in its client's web origins |
| Dex | no |
| Google | no |

Where it is refused, browser mode cannot discover anything, and `fetch` reports only
"Failed to fetch". Two ways around it, both in use here:

- give `endpoints` directly, which is what `providers.ts` does for Dex
- resolve them on a server, which is what `src/api/capabilities.ts` does for the panel

Server mode is unaffected: a server is not subject to CORS.

## Server mode

Server mode needs a client secret and a cookie secret, neither of which may carry a
`VITE_` prefix: that prefix puts a value in the browser bundle.

```
OIDC_CLIENT_SECRET=...
SESSION_SECRET=at-least-32-characters
```

The routes are mounted per provider at `/auth/<provider>`, so more than one can be
configured at once.

## Reading the browser without breaking hydration

`location` and the stored selection exist only in a browser. Reading either while
rendering makes the server produce different markup from the client, hydration finds the
mismatch and keeps the server's version, and the page then responds to nothing: the
provider reads as the default and the callback parameters as absent.

So both pages render server-safe placeholders and adopt the real values in `onMount`. The
selection signal starts at its default rather than at what is stored, and
`restoreSelection()` adopts the stored value once mounted.

## What this is not

It reports what a provider sent. It does not verify anything: the tokens shown are decoded
without checking a signature, deliberately, so a token this application would refuse is
still visible. Verification belongs at the service receiving a token, through
`@fluixi/oauth2/verify`.

## A browser-held session needs the provider to allow CORS

The exchange is a cross-origin POST to the token endpoint, so the provider has to permit
it. Measured from `http://localhost:3100`:

| | discovery document | token endpoint |
| --- | --- | --- |
| Keycloak | yes, once the origin is in the client's web origins | yes |
| Okta | no | yes |
| Auth0 | no | yes, `*` |
| Dex | **no** | **no** |
| Google | no | refuses a public client anyway |

Where discovery is refused, endpoints can be given directly. Where the **token endpoint** is
refused there is nothing to work around, which is why Dex is server mode only.

## Registering redirect URIs

Each mode uses a different path, and a provider accepts only what is registered with it.
For this app on port 3100:

```
http://localhost:3100/callback                      browser mode, all providers
http://localhost:3100/auth/<provider>/callback      server mode, per provider
```

So Keycloak's client needs `http://localhost:3100/auth/keycloak/callback` before server
mode can complete, and a missing entry shows as `redirect_uri is invalid` from the
provider rather than as anything this app can report.

Server mode may use a different client from browser mode, since it authenticates with a
secret and a public client has none. `serverClientId` names it, and that client needs the
callback registered too: Dex refused `/auth/dex/callback` until `orders-api` carried it.

## Reading the environment

Server mode reads its secrets when the first request arrives rather than when the module
loads: the framework copies `.env` into `process.env` as it starts, and a module-level read
happens before that. A value present in the file would otherwise read as absent and
nothing would mount.

`/api/modes` reports which providers are mounted and why the others are not, so a missing
variable is named instead of looking like a broken route.
