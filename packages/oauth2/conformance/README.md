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
| Authorization code with PKCE | yes | yes | yes (login page is not scriptable) |
| `client_credentials` | yes | **no** | yes |
| userinfo | yes | yes | yes |
| Introspection endpoint | yes | yes | **no** |
| Revocation endpoint | yes | **no** | yes |
| End session endpoint | yes | **no** | yes |
| Access token carries `aud` | not until an audience mapper | yes | yes |
| Names the calling client | `azp` | **neither** | `azp` |

Three consequences for anyone configuring this package:

- **Keycloak** needs `audience: false` with `authorizedParty`, or an audience mapper on
  the client. It also refuses to introspect a token whose audience excludes the asking
  client, and says only `active: false` about it.
- **Dex** puts neither `azp` nor `client_id` on an access token, so `authorizedParty` has
  nothing to check and `aud` is the only handle.
- **Auth0** needs an API registered and `audience` sent, or it returns an opaque token.
  Its issuer carries a **trailing slash** that the `iss` claim includes. It publishes no
  introspection endpoint at all, so `createTokenIntrospector` does not apply there.

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
without a browser. Providers that require a real browser, Google among them, run the
unattended tier alone.

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
