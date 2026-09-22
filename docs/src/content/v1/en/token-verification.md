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

Wrapping that up is usually worth it:

```ts
export function guard(
  handler: (request: Request, claims: TokenClaims) => Response | Promise<Response>,
  options: { role?: string } = {},
) {
  return async (request: Request): Promise<Response> => {
    let claims: TokenClaims;
    try {
      claims = await verify.fromRequest(request);
    } catch (cause) {
      const code = cause instanceof TokenError ? cause.code : 'invalid_token';
      return new Response(JSON.stringify({ error: code }), {
        status: 401,
        headers: { 'www-authenticate': `Bearer error="${code}"` },
      });
    }

    // Authorization is a separate question from authentication: the token is genuine,
    // and this decides whether it is enough for this route.
    const roles = (claims.realm_access as { roles?: string[] })?.roles ?? [];
    if (options.role && !roles.includes(options.role)) {
      return new Response(JSON.stringify({ error: 'insufficient_role' }), { status: 403 });
    }

    return handler(request, claims);
  };
}
```

```ts
export const GET = guard(async (request, claims) => Response.json({ id: claims.sub }));
export const DELETE = guard(handler, { role: 'superadmin' });
```

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
