# Provider conformance

What a provider actually does, checked against what this package assumes.

```
node conformance/run.mjs keycloak
node conformance/run.mjs --all
```

Build the package first: the suite imports `dist`, which is what an app would.

## What three providers actually do

Run against Keycloak 26, Dex 2.41 and an Auth0 tenant. None of them needed a code change,
which is the result worth having: the differences below are configuration, not forks.

| | Keycloak | Dex | Auth0 |
| --- | --- | --- | --- |
| Discovery | yes | yes | yes |
| Authorization code with PKCE | yes | yes | yes, login page not scriptable |
| `client_credentials` | yes | **no** | yes |
| userinfo | yes | yes | yes, works with an opaque token |
| Introspection endpoint | yes | yes | **no** |
| Revocation endpoint | yes | **no** | yes, with the grant enabled on the client |
| End session endpoint | yes | **no** | yes |
| Access token is a JWT | yes | yes | only when an API is named |
| Access token carries `aud` | not until an audience mapper | yes | yes, the API identifier |
| Names the calling client | `azp` | **neither** | `azp` |
| Issuer has a trailing slash | no | no | **yes**, and `iss` includes it |

What that means when configuring this package:

- **Keycloak** needs `audience: false` with `authorizedParty`, or an audience mapper on the
  client. It refuses to introspect a token whose audience excludes the asking client and
  says only `active: false` about it. It also revokes the whole session when an
  authorization code is replayed, which RFC 6749 recommends.
- **Dex** puts neither `azp` nor `client_id` on an access token, so `authorizedParty` has
  nothing to check and `aud` is the only handle. No client credentials grant, no
  revocation, no end session.
- **Auth0** needs an API registered and `audience` sent, or the access token is opaque.
  Its issuer carries a trailing slash that `iss` includes. It publishes no introspection
  endpoint, so `createTokenIntrospector` does not apply.

### Auth0 treats every grant as a separate authorization

Worth stating on its own, because none of these imply each other and each produced a
failure that read like something else:

- authorized for an API via `client_credentials` is not authorized via the password grant,
  and the refusal blames the resource server rather than the grant
- issuing a refresh token is not accepting one back: `offline_access` in the scope and the
  `refresh_token` grant on the client are separate settings
- the password grant is refused outright to a single page application, since a public
  client cannot authenticate itself and that grant has no PKCE to stand in

Keycloak enables these together. An app moving from one to the other meets all three.

## What it reports

Three kinds of row, and the distinction matters.

- **PASS / FAIL**: something that must hold. A `FAIL` is a defect in this package.
- **YES / no**: a capability a provider may legitimately lack. Dex publishes no revocation
  endpoint; that is a fact to document, not a bug.
- **note**: an observation with no pass or fail, such as whether tokens are JWTs.

## Secrets

A client secret does not belong in a file that sits in a repository. Name the variable
instead, and the suite reads it at run time:

```jsonc
"service": { "clientId": "abc123", "clientSecret": "env:AUTH0_M2M_SECRET" }
```

```
export AUTH0_M2M_SECRET=...
node conformance/run.mjs auth0
```

A missing variable is reported by name rather than failing somewhere deeper. Configs
matching `*.local.json` are ignored by git, for a tenant you would rather not name at all.

## Adding a provider

Drop a JSON file in `providers/`. The shape is in `keycloak.json`, and the
`.example.json` files carry setup instructions for providers needing an account.

```jsonc
{
  "issuer": "https://...",
  "client":  { "clientId": "...", "redirectUri": "...", "scopes": [...] },
  "service":   { "clientId": "...", "clientSecret": "..." }, // omit without client_credentials
  "introspect":{ "clientId": "...", "clientSecret": "..." }, // defaults to `service`
  "user": {
    "username": "...", "password": "...",
    // Either drive the login form, or use the password grant where one is enabled.
    "form": { "actionPattern": "action=\"([^\"]+)\"", "usernameField": "login",
              "passwordField": "password", "extraFields": {} }
  }
}
```

Omitting a section skips its checks rather than failing them. A provider with no
`service` block is not reported as broken, only as untested for that grant.

## Ordering

The replayed-code check runs last. Keycloak revokes the whole session when a code is
presented twice, which is what RFC 6749 recommends, and running the check earlier
destroyed the session everything after it needed. A provider that behaves correctly here
is hostile to a test suite that assumes otherwise.

## Tiers

Everything except the user flow runs unattended: discovery, the client credentials grant,
JWKS verification, introspection, revocation. Those are the checks a cloud provider can
answer with nothing but credentials in a config file.

The user flow needs a person, so it runs only where the config says how to obtain one
without a browser. Two ways:

- `user.form` drives the provider's own login page, which works where that page is plain
  HTML. Keycloak and Dex are.
- `user.passwordGrant` asks the token endpoint directly. The grant is deprecated in OAuth
  2.1 and no application should sign anyone in with it, which is beside the point here:
  it is the only way to obtain a user token unattended from a provider whose login page
  is JavaScript. Auth0 is one, and it needs the grant enabled on the application plus a
  default directory, or `user.realm` to use its own variant.

A provider offering neither runs the unattended tier alone. Google is one.

## Standing up the local ones

Keycloak:

```
docker run -d --name keycloak -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:26 start-dev
```

Dex, which is deliberately a different implementation and lacks the grants Keycloak has:

```
docker run -d --name dex -p 5556:5556 \
  -v "$PWD/dex-config.yaml:/etc/dex/config.yaml" \
  ghcr.io/dexidp/dex:v2 dex serve /etc/dex/config.yaml
```

A password in a Dex config is a bcrypt hash with a `$2a$` prefix, not plain text:

```
htpasswd -nbBC 10 x yourpassword | cut -d: -f2 | sed 's/\$2y\$/\$2a\$/'
```
