# Token verification

Everything on the previous pages decides what to render. This decides what is allowed, and
it is the only part that protects anything.

A client holds a token and sends it. The service receiving it must not take it on trust:
signature, issuer, audience and expiry, on every request.

```ts
import { createTokenVerifier } from '@fluixi/oauth2/verify';

const verify = createTokenVerifier({
  issuer: process.env.OIDC_ISSUER!,
  audience: 'admin-spa',
});

const claims = await verify.fromRequest(request);   // throws unless everything holds
```

Nothing here is Fluixi-specific. It takes a `Request` or a bare string and returns claims,
so an Express service, a worker, a Hono route or a plain Node handler can import it without
adopting anything else.

## In an API route

```ts
// src/api/orders.ts
import { createTokenVerifier, TokenError } from '@fluixi/oauth2/verify';

const verify = createTokenVerifier({ issuer, audience });

export async function GET(request: Request) {
  try {
    const claims = await verify.fromRequest(request);
    return Response.json(await listOrdersFor(claims.sub));
  } catch (cause) {
    const code = cause instanceof TokenError ? cause.code : 'invalid_token';
    return new Response(JSON.stringify({ error: code }), {
      status: 401,
      headers: { 'www-authenticate': `Bearer error="${code}"` },
    });
  }
}
```

The `WWW-Authenticate` header is worth sending. It is how a client tells an expired token
from a broken endpoint, and what `@fluixi/oauth2`'s own client reads to decide it should
refresh.

### The API guard

Repeating that in every route is how one of them ends up without the header.
`createApiGuard` wraps a handler instead, and it ships with the package, so the header format
and the client that reads it come from the same place:

```ts
// src/services/verify.server.ts
import { createTokenVerifier, createApiGuard } from '@fluixi/oauth2/verify';
import { rolesFrom } from '@fluixi/oauth2/roles';
import { auth } from '../config/env.js';

// The preset knows what this provider's tokens look like: issuer spelling, audience policy.
export const verify = createTokenVerifier(auth.provider.verifier(auth.clientId));

export const guard = createApiGuard({ verify, roles: rolesFrom.keycloakRealm });
```

```ts
// src/api/orders.ts
import { guard } from '../services/verify.server.js';

export const GET = guard(async (_request, claims) => Response.json(await listOrdersFor(String(claims.sub))));
export const DELETE = guard(deleteOrder, { role: 'admin' });
export const POST = guard(deleteOrder, {
  scope: 'orders:write',
  require: (claims) => claims.tenant === 'acme' || 'wrong tenant',
});
```

A token that fails gets a 401 with `WWW-Authenticate: Bearer error="<code>"`. A genuine token
that is not enough for the route gets a 403. Keep the two apart: a client that sees 401 for a
missing role refreshes a perfectly good token and asks again, forever. The 401 carries the error
code and never the message, because a refusal that explains why a token failed tells an
attacker which guesses are close.

`auth.provider.verifier(auth.clientId)` builds the verifier options from the preset
`authFromEnv` chose (see [OAuth2](/v1/en/oauth2)), so the issuer spelling and audience policy
match the provider.

The second argument is what the route demands beyond a valid token:

| Requirement | Passes when |
| --- | --- |
| `role` | the token holds any one of the roles |
| `allRoles` | it holds every one |
| `scope` | its `scope` claim holds any one of them |
| `require(claims, request)` | the function returns `true`; a string refuses and says why |

Providers keep roles in different places, so there is no default. A `role` requirement on a
guard built without `roles` throws, rather than answering 403 to everyone and looking like a
permissions problem. `rolesFrom` covers the shapes in use:

| `rolesFrom.` | Reads |
| --- | --- |
| `keycloakRealm` | `realm_access.roles` |
| `keycloakClient(clientId)` | `resource_access[clientId].roles` |
| `groups` | `groups`, as Okta sends it when a groups claim is configured |
| `cognito` | `cognito:groups` |
| `namespaced(claim)` | a custom claim, as an Auth0 action adds it |
| `scope` | the `scope` claim, for a provider that issues no roles |

`onRefused(refusal, request)` answers in the app's own error shape. A 401 still gets the
`WWW-Authenticate` header unless the response already carries one, because without it the
client cannot tell an expired token from a dead endpoint.

## Why the options are shaped this way

The cryptography is [`jose`](https://github.com/panva/jose)'s, deliberately. A
hand-written verifier is how `alg: none` and RS256-to-HS256 confusion get shipped, and
both turn a check into a way in. What this adds is the configuration around it, where the
common mistakes live.

**`issuer` is required** and never taken from the token. A token naming its own issuer
proves nothing.

**`audience` is required,** or an explicit `audience: false`. Forgetting it is easy and
silently accepts a token minted for any other client of the same provider.

**`algorithms` defaults to `['RS256']`** and is never read from the token header. That is
what stops a token switching to `HS256` and being signed with the public key as an HMAC
secret. `none` is rejected when the verifier is built.

**The JWKS comes from discovery,** so a service does not hardcode the URL, and `jose`
handles caching, key rotation and refetch cooldown. Give `jwksUri` to skip discovery, or
`jwks` to supply the keys directly, which pins them and stops rotation working.

`jose` is an optional peer dependency. An app that never verifies never installs it.

## Providers that omit `aud`

Keycloak issues access tokens with no `aud` claim until an audience mapper is configured,
naming the client in `azp` instead. A service in front of one wants:

```ts
createTokenVerifier({
  issuer,
  audience: false,
  authorizedParty: 'admin-spa',
});
```

Not `audience: false` on its own, which accepts a token minted for any client of the
issuer. That skips the check rather than moving it, and the verifier warns when neither is
set.

Configuring an audience mapper at the provider and using `audience` is the better end
state. `authorizedParty` is for when you do not control that.

### A provider that names itself more than one way

Google publishes its issuer as both `accounts.google.com` and
`https://accounts.google.com`, and a token can carry either. A service pinned to one
rejects the other, which looks like a signature failure and is not.

`issuer` takes a list for that. Discovery uses the first; any of them is accepted on a
token.

```ts
createTokenVerifier({
  issuer: ['https://accounts.google.com', 'accounts.google.com'],
  audience: clientId,
});
```

## Extra checks

`require` runs once the token holds, for anything specific to the service. Return `true`,
or a string to use as the message.

```ts
const verify = createTokenVerifier({
  issuer,
  audience,
  require: (claims) =>
    String(claims.scope ?? '').includes('billing') || 'This endpoint needs the billing scope.',
});
```

## DPoP-bound tokens

A token bound with DPoP carries `cnf.jkt`, the thumbprint of the client's key, and each request
carries a proof signed with that key in the `DPoP` header. Without `dpop: true` the verifier
accepts a bound token as though it were a bearer token, and the binding protects nothing.

```ts
import { createTokenVerifier } from '@fluixi/oauth2/verify';

export const verify = createTokenVerifier({
  issuer: 'https://example.okta.com/oauth2/default',
  audience: 'api://orders',
  dpop: true,
});

export async function claimsOf(request: Request) {
  // `fromRequest`, not `verify(token)`: the proof is a header on the request.
  return verify.fromRequest(request);
}
```

With it, a token without `cnf.jkt` is refused, and so is a bound one whose proof does not match:
the proof's key must have the token's thumbprint, `htm` and `htu` must match this request's
method and URL, `ath` must be this token's hash, and `iat` must be within `dpopProofAgeSec`
(10 seconds unless set). A missing proof is `missing_dpop_proof` and any mismatch
`invalid_dpop_proof`; `createApiGuard` returns either as the 401 code. The client side, in both
token modes, is on the [OAuth2](/v1/en/oauth2) page.

## Opaque tokens, and introspection

Not every provider issues a JWT. An opaque reference token carries nothing and means
nothing outside the provider, which is the point: it leaks nothing if it is intercepted,
and the provider stays the only thing that can say what it stands for.

There is no way to verify one locally. The service asks instead, over RFC 7662:

```ts
import { createTokenIntrospector } from '@fluixi/oauth2/verify';

const verify = createTokenIntrospector({
  issuer: process.env.OIDC_ISSUER!,
  clientId: 'orders-api',
  clientSecret: process.env.ORDERS_API_SECRET!,
  audience: 'orders-api',
});

const claims = await verify.fromRequest(request);   // same shape as the JWT verifier
```

It returns the same `TokenVerifier`, so `guard` above works unchanged. Swapping one for
the other is a one-line change.

### What it costs and what it buys

Introspection is a network call to the provider on the path of every request, where JWT
verification is local arithmetic against a cached key.

What you get for that is the property a signature cannot give. A signature says a token
was genuine when it was minted; introspection says it is good **now**. A token revoked
five minutes ago still verifies locally and is refused here at once.

`cacheMs` reuses an `active` answer for a window, and defaults to `0`, meaning ask every
time. Anything above zero trades away exactly the property you came for, so keep it small
and deliberate. A refusal is never cached, because that would keep a reinstated token out.

### Client credentials are required

The introspection endpoint is authenticated, and that is not incidental: an open one would
let anyone test whether a stolen token is still live. A service needs its own `clientId`
and `clientSecret` at the provider, so this is a server-side tool. Never ship these to a
browser.

Credentials go in an `Authorization: Basic` header by default. `clientAuthMethod: 'body'`
puts them in the form for a provider that wants them there.

### Credentials from the environment

How a client authenticates to introspection is the provider's choice, made in its console: a
shared secret, or `private_key_jwt`, a signature from a key whose public half the provider
holds. The two are exclusive, and code that assumes a secret has nothing to read for an Okta
client set to public/private key. `credentialsFromEnv` reads whichever is configured:

```ts
// src/api/introspect.ts
import { createTokenIntrospector, credentialsFromEnv, explainCredentials } from '@fluixi/oauth2/verify';

export async function POST(request: Request) {
  const credentials = await credentialsFromEnv({ prefix: 'okta' });
  if (!credentials) {
    return Response.json({ error: explainCredentials({ prefix: 'okta' }) }, { status: 501 });
  }
  const introspect = createTokenIntrospector({
    issuer: 'https://example.okta.com/oauth2/default',
    ...credentials,
    audience: false,
  });
  return Response.json(await introspect.fromRequest(request));
}
```

| Variable | Meaning |
| --- | --- |
| `OKTA_CLIENT_ID` | the client that asks; `clientId` in the options otherwise |
| `OKTA_CLIENT_SECRET` or `OKTA_SECRET` | a shared secret |
| `OKTA_PRIVATE_KEY` | path to the private JWK; `~` is expanded |
| `OKTA_KEY_ID` | the `kid` the provider knows the key by |
| `OKTA_ASSERTION_ALG` | the assertion algorithm, when not the default |

The prefix is yours; `okta` above. `<PREFIX>_INTROSPECT_*` is tried first, for a provider that
wants a different client to ask than the one people sign in with: a public SPA at Okta cannot
introspect, so an API Services client does it. A key wins over a secret. A key file that is
named but unreadable throws, because that is a broken configuration rather than a missing one,
and `null` means nothing is configured. `explainCredentials` names both ways to set it up, which
is what the 501 above tells an operator. Server only: the key file is read with Node.

### The `active: false` that means something else

A provider answers `{ "active": false }` and nothing more, so a genuinely dead token and a
misconfiguration look identical.

The usual cause of the second is that the asking client is not in the token's audience.
Keycloak refuses to introspect a token minted for someone else and says only `active:
false` about it. The fix is an audience mapper on the client so its tokens carry
`aud: <client>`, after which introspection answers normally.

### Which to use

| | `createTokenVerifier` | `createTokenIntrospector` |
| --- | --- | --- |
| Token | a JWT | opaque, or a JWT |
| Cost | local, one cached key fetch | a request to the provider, per call |
| Revocation | not seen until expiry | immediate |
| Needs client credentials | no | yes |

Use the verifier where tokens are JWTs and short-lived. Use the introspector where tokens
are opaque, or where a revoked session must stop working at once and you will pay a round
trip for it.

## Verified and informative are different

A token can verify perfectly and tell you almost nothing. Keycloak's lightweight access
tokens carry no `sub` and few claims, and any provider can be configured to issue thin
tokens.

So verification answers "is this genuine and for me". It does not answer "who is this",
and a service needing the second should call userinfo or its own store rather than
assuming the claims are there.

Revocation is the other limit. A signature-valid token for an account disabled five minutes
ago still verifies. Short token lifetimes and a check against your own store are what close
that, not the signature.

## What belongs where

| Question | Where |
| --- | --- |
| Should I show this button | the client, with `can()` and `Can` |
| Is this token genuine and for me | this page, at the API |
| Is this person allowed to do this | your API, after verifying |

The first is a rendering aid and a client can forge it. The second and third are the real
boundary.

Next: **[Routing](/v1/en/routing)**.
