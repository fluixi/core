# Service to service

Every page before this one answers "who is using this app". This answers "which service is
calling", which is the other half of most systems: a nightly job reading an API, one
service talking to another, a webhook handler that needs to write back.

There is no user in any of it, so there is nothing to redirect and no login page. The
service proves who it is with its own credentials.

```ts
import { createServiceClient } from '@fluixi/oauth2/service';

const orders = createServiceClient({
  issuer: process.env.OIDC_ISSUER!,
  clientId: 'reports-job',
  clientSecret: process.env.REPORTS_SECRET!,
  scopes: ['orders:read'],
});

const response = await fetch('https://api.example.com/orders', {
  headers: { authorization: `Bearer ${await orders.token()}` },
});
```

That is the whole thing. `token()` returns a valid token, fetching one when it has to and
reusing it when it does not.

## Server side only

The grant **is** the client secret. Anything holding it can mint tokens as this service,
so it belongs in an environment variable on a server and never in anything shipped to a
browser.

If you find yourself wanting this in front-end code, the thing you actually want is
[OAuth2](/v1/en/oauth2): a user signs in, and their token carries what they may do.

## Caching, and why it matters

`token()` keeps the token until it is close to expiring, then fetches a new one.
`refreshSkewMs` is how close, and defaults to 30 seconds. A token that expires in flight
fails a request that was fine when it started, which is the whole reason for the margin.

The second behaviour is less obvious and matters more under load. When several calls
arrive on a cold cache, they make **one** token request between them rather than one each:

```ts
// One request to the provider, three callers served.
const [a, b, c] = await Promise.all([orders.token(), orders.token(), orders.token()]);
```

Without that, a burst of work at the start of a job is a burst at the token endpoint, and
providers rate-limit it.

A failed request is not cached, so a provider that was briefly down is retried rather than
remembered as broken.

## Setting it up at the provider

The client has to be **confidential**, meaning it has a secret, and it needs the client
credentials grant enabled. In Keycloak that is a client with `Client authentication` on
and `Service accounts roles` enabled. Most providers name it something similar.

Worth knowing how the resulting token reads: a service is a principal in its own right,
not an absent one. Keycloak gives it a service account, so `sub` is that account's id and
`preferred_username` is `service-account-<client>`. It is not a person, but it is not
anonymous either.

## Provider differences

**Auth0** wants the API named in `audience`, and issues an opaque token rather than a JWT
without it:

```ts
createServiceClient({ issuer, clientId, clientSecret, audience: 'https://api.example.com' });
```

**Credentials in the body.** They go in an `Authorization: Basic` header by default, which
keeps the secret out of the request body. Some providers want them in the form instead:

```ts
createServiceClient({ issuer, clientId, clientSecret, clientAuthMethod: 'body' });
```

**A key instead of a secret.** A client registered with a public key authenticates with
`private_key_jwt`: pass `privateKey` (a JWK) and `keyId`, and no secret travels at all. Okta's
org authorization server accepts nothing else for client credentials.
`credentialsFromEnv` reads either setup from the environment and spreads straight in; see
[Token verification](/v1/en/token-verification#credentials-from-the-environment).

```ts
import { createServiceClient } from '@fluixi/oauth2/service';
import { credentialsFromEnv } from '@fluixi/oauth2/verify';

const credentials = await credentialsFromEnv({ prefix: 'orders' });
if (!credentials) throw new Error('Set ORDERS_CLIENT_SECRET, or ORDERS_PRIVATE_KEY and ORDERS_KEY_ID.');

export const orders = createServiceClient({ issuer, ...credentials });
```

**No discovery document.** Give the token endpoint directly with `tokenEndpoint`.

**Anything else** goes through `extraParams`, which is merged into the token request.

## The other side

A service receiving one of these tokens verifies it exactly as it verifies a user's. The
token names the calling client rather than a person, so the check is usually on that:

```ts
const verify = createTokenVerifier({
  issuer,
  audience: 'orders-api',
  require: (claims) => String(claims.scope ?? '').includes('orders:read'),
});
```

See [Token verification](/v1/en/token-verification). Scopes are how a provider says what a
service may do, and checking them is the point of issuing narrow ones.

## Reading the current token

`current()` returns what the provider sent, for a caller that needs more than the string:

```ts
const { accessToken, expiresAt, scope } = await orders.current();
```

`reset()` drops the cached token, so the next call fetches a new one. Useful after a 401
that suggests the token was revoked before its expiry.

Next: **[Token verification](/v1/en/token-verification)**.
