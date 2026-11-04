# @fluixi/oauth2

## 1.0.0-alpha.107

### Patch Changes

- @fluixi/auth@1.0.0-alpha.107
- @fluixi/session@1.0.0-alpha.107

## 1.0.0-alpha.106

### Patch Changes

- @fluixi/auth@1.0.0-alpha.106
- @fluixi/session@1.0.0-alpha.106

## 1.0.0-alpha.105

### Patch Changes

- @fluixi/auth@1.0.0-alpha.105
- @fluixi/session@1.0.0-alpha.105

## 1.0.0-alpha.104

### Patch Changes

- 4bc547f: A token request that fails at the callback redirects the user to the app with an `auth_error` (provider_unreachable or refusal code) rather than showing an error page.
  - @fluixi/auth@1.0.0-alpha.104
  - @fluixi/session@1.0.0-alpha.104

## 1.0.0-alpha.103

### Patch Changes

- a36dd15: The login route forwards `prompt=create` to the provider.
  - @fluixi/auth@1.0.0-alpha.103
  - @fluixi/session@1.0.0-alpha.103

## 1.0.0-alpha.102

### Patch Changes

- b1dd71b: `oauthRoutes` takes a new option, `authorizeParams`: names of login query parameters to pass to the authorization request, for provider parameters that vary per login.
  - @fluixi/auth@1.0.0-alpha.102
  - @fluixi/session@1.0.0-alpha.102

## 1.0.0-alpha.101

### Patch Changes

- @fluixi/auth@1.0.0-alpha.101
- @fluixi/session@1.0.0-alpha.101

## 1.0.0-alpha.100

### Minor Changes

- 70f0007: When a renewal request times out, the connection is cut after sending, or a 2xx response has no `access_token`, the session ends and the refresh token is not sent again. If a renewal receives a 429 or 5xx response or the connection never opens, the session is kept and the renewal is retried after the `Retry-After` header or after 5 seconds by default. `tokenTimeoutMs` (default 10000 ms) limits how long a token request may take. A 400 or 401 response still ends the session.

### Patch Changes

- 94153dc: `@fluixi/oauth2` installs `@fluixi/auth` and `@fluixi/session` directly, so applications using `@fluixi/oauth2` may remove `@fluixi/auth` from their dependencies if it's only used for OAuth2. Its peers include `@fluixi/dom` and `@fluixi/storage`, and Fluixi packages depend on each other through `^` ranges.
- Updated dependencies [94153dc]
  - @fluixi/auth@1.0.0-alpha.100
  - @fluixi/session@1.0.0-alpha.100

## 1.0.0-alpha.99

### Patch Changes

- 3ed276b: Fluixi peer dependencies are published as ^ ranges (^1.0.0-alpha.N) instead of exact versions.
- 4ec5021: `@fluixi/start/di` re-exports `@fluixi/di` and server functions and API routes end the request context they create, releasing request services; `@fluixi/oauth2` imports `@fluixi/di` instead of `@fluixi/start/di`.

## 1.0.0-alpha.14

### Patch Changes

- Updated dependencies [86e38e1]
  - @fluixi/server@1.0.0-alpha.98
  - @fluixi/start@0.1.0-alpha.88
  - @fluixi/auth@1.0.0-alpha.98
  - @fluixi/core@1.0.0-alpha.98
  - @fluixi/session@1.0.0-alpha.98
  - @fluixi/reactive@1.0.0-alpha.98

## 1.0.0-alpha.13

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.97
- @fluixi/core@1.0.0-alpha.97
- @fluixi/session@1.0.0-alpha.97
- @fluixi/auth@1.0.0-alpha.97
- @fluixi/server@1.0.0-alpha.97
- @fluixi/start@0.1.0-alpha.87

## 1.0.0-alpha.12

### Minor Changes

- 692e1ed: `oauthRoutes` answers POST `<basePath>/backchannel-logout`, the URL to register as the client's `backchannel_logout_uri`, allowing a valid logout token to end the matching session in `sessionLocals`, `/me` and `/refresh`, with logouts kept in memory by default and shared between instances by passing a `LogoutStore` as `logouts`.
- 6237963: requestAuth() now reports `unreachable: true` when a session exists but the provider cannot be reached, and the login route now redirects back to the app with `?auth_error=provider_unreachable` when the provider is down, while server discovery errors indicate the provider was not reached.

### Patch Changes

- 8664703: A callback whose state matches no pending sign-in now restarts the sign-in once, or redirects home if already signed in, and a second mismatch redirects to the default page with `auth_error=state_mismatch`.
- Updated dependencies [a4e5272]
- Updated dependencies [bc7e5f1]
  - @fluixi/core@1.0.0-alpha.96
  - @fluixi/auth@1.0.0-alpha.96
  - @fluixi/session@1.0.0-alpha.96
  - @fluixi/start@0.1.0-alpha.86
  - @fluixi/reactive@1.0.0-alpha.96
  - @fluixi/server@1.0.0-alpha.96

## 1.0.0-alpha.11

### Patch Changes

- Updated dependencies [d1eea79]
- Updated dependencies [d9fb1c4]
- Updated dependencies [e4cf090]
- Updated dependencies [f4528b2]
- Updated dependencies [06a5af9]
  - @fluixi/core@1.0.0-alpha.95
  - @fluixi/start@0.1.0-alpha.85
  - @fluixi/auth@1.0.0-alpha.95
  - @fluixi/server@1.0.0-alpha.95
  - @fluixi/session@1.0.0-alpha.95
  - @fluixi/reactive@1.0.0-alpha.95

## 1.0.0-alpha.10

### Patch Changes

- Updated dependencies [8362b9a]
  - @fluixi/core@1.0.0-alpha.94
  - @fluixi/start@0.1.0-alpha.84
  - @fluixi/auth@1.0.0-alpha.94
  - @fluixi/server@1.0.0-alpha.94
  - @fluixi/session@1.0.0-alpha.94
  - @fluixi/reactive@1.0.0-alpha.94

## 1.0.0-alpha.9

### Patch Changes

- bf0907f: In the devtools graph, app modules and the services they provide appear as groups, and the auth service is shown under its module with its state named (user, token, status, roles and the rest) instead of anonymous signals.
- Updated dependencies [2fb0e05]
- Updated dependencies [722d8c8]
- Updated dependencies [a8610c2]
- Updated dependencies [46bf253]
- Updated dependencies [b324fbc]
- Updated dependencies [407217b]
- Updated dependencies [5dcdf9f]
- Updated dependencies [df021bf]
- Updated dependencies [8940d60]
- Updated dependencies [cc2a6f8]
- Updated dependencies [cced6d2]
- Updated dependencies [9136d35]
- Updated dependencies [de2135e]
- Updated dependencies [eab30a6]
- Updated dependencies [e77734a]
- Updated dependencies [f2f2447]
- Updated dependencies [55a57dd]
- Updated dependencies [557896f]
- Updated dependencies [eabcfe0]
- Updated dependencies [4bd61db]
- Updated dependencies [9a05eb9]
- Updated dependencies [b992f7e]
- Updated dependencies [9ef2827]
- Updated dependencies [fa72d27]
- Updated dependencies [daae54a]
- Updated dependencies [dde7a4e]
- Updated dependencies [b3ea476]
- Updated dependencies [fb67321]
- Updated dependencies [73665aa]
- Updated dependencies [bf0907f]
- Updated dependencies [de25d02]
- Updated dependencies [d1268d1]
- Updated dependencies [ae0e561]
- Updated dependencies [b0ea788]
- Updated dependencies [090e5c5]
- Updated dependencies [c550b22]
- Updated dependencies [cd49ddc]
- Updated dependencies [948b2be]
- Updated dependencies [92fe73b]
- Updated dependencies [9295123]
- Updated dependencies [6764f45]
- Updated dependencies [b2e1ff3]
- Updated dependencies [ceb7864]
- Updated dependencies [ffc1b08]
  - @fluixi/start@0.1.0-alpha.83
  - @fluixi/auth@1.0.0-alpha.93
  - @fluixi/reactive@1.0.0-alpha.93
  - @fluixi/core@1.0.0-alpha.93
  - @fluixi/session@1.0.0-alpha.93
  - @fluixi/server@1.0.0-alpha.93

## 1.0.0-alpha.8

### Patch Changes

- Updated dependencies [7864fb6]
- Updated dependencies [9eb3e98]
- Updated dependencies [7a516d3]
- Updated dependencies [82c72c0]
  - @fluixi/start@0.1.0-alpha.82
  - @fluixi/auth@1.0.0-alpha.92
  - @fluixi/core@1.0.0-alpha.92
  - @fluixi/server@1.0.0-alpha.92
  - @fluixi/session@1.0.0-alpha.92
  - @fluixi/reactive@1.0.0-alpha.92

## 1.0.0-alpha.7

### Patch Changes

- Updated dependencies [6e98608]
  - @fluixi/start@0.1.0-alpha.81
  - @fluixi/auth@1.0.0-alpha.91
  - @fluixi/reactive@1.0.0-alpha.91
  - @fluixi/core@1.0.0-alpha.91
  - @fluixi/session@1.0.0-alpha.91
  - @fluixi/server@1.0.0-alpha.91

## 1.0.0-alpha.6

### Patch Changes

- Updated dependencies [9d334dc]
  - @fluixi/start@0.1.0-alpha.80
  - @fluixi/auth@1.0.0-alpha.90
  - @fluixi/reactive@1.0.0-alpha.90
  - @fluixi/core@1.0.0-alpha.90
  - @fluixi/session@1.0.0-alpha.90
  - @fluixi/server@1.0.0-alpha.90

## 1.0.0-alpha.5

### Patch Changes

- 6855d6f: `BrowserConfig.tokenAuthMethod` now accepts RFC names as values, allowing presets or `authFromEnv` clients to spread into a browser config without a type error.
- 7415caa: `navigate` now accepts the router `useNavigate` without a type error.
- Updated dependencies [4ada5ee]
  - @fluixi/start@0.1.0-alpha.79
  - @fluixi/auth@1.0.0-alpha.89
  - @fluixi/reactive@1.0.0-alpha.89
  - @fluixi/core@1.0.0-alpha.89
  - @fluixi/session@1.0.0-alpha.89
  - @fluixi/server@1.0.0-alpha.89

## 1.0.0-alpha.4

### Minor Changes

- 8532a1a: `oauthRoutes` and `sessionLocals` accept `dpop: true` and `dpopAlgorithm`. The session's DPoP key is stored in the encrypted session cookie. With `authFromEnv`, `AUTH_DPOP=true` turns it on.

## 1.0.0-alpha.3

### Minor Changes

- 61435a3: `authModule(auth)` registers the service and client tokens from `src/app.config.ts`, and `authServerModule(config)` mounts `oauthRoutes` and `sessionLocals` from `src/app.config.server.ts`.

## 1.0.0-alpha.2

### Patch Changes

- Updated dependencies [d5ebde7]
  - @fluixi/start@0.1.0-alpha.78
  - @fluixi/auth@1.0.0-alpha.88
  - @fluixi/reactive@1.0.0-alpha.88
  - @fluixi/core@1.0.0-alpha.88
  - @fluixi/session@1.0.0-alpha.88
  - @fluixi/server@1.0.0-alpha.88

## 1.0.0-alpha.1

### Minor Changes

- a7f506e: `createApiGuard` and `rolesFrom` now generate the 401 response with a WWW-Authenticate header, matching what `browser.ts` reads.
- 14745db: `authFromEnv` on `@fluixi/oauth2/env` now reads `VITE_AUTH_*` into a preset and client config.
- d6d2465: `createAuthService` returns the guards as well as the session: `protectedRoute`, `Can`, `Protect`, `useAuth`, `useUser` and `useCan` come back on the service, so an app declares its authentication once instead of wiring `createAuthHooks` to it in a second file. `navigate`, `loginPath`, `homePath` and `forbiddenPath` move onto the same options object.
- 2df7274: `@fluixi/oauth2/callback` now provides `OAuthCallback` and `useOAuthCallback`.
- fa7c024: Three shapes that most deployments end up needing.

  `createServiceClient` on `@fluixi/oauth2/service` asks for a token with the `client_credentials` grant, for a background job or one service calling another with no user involved. It caches until the token is close to expiring, and a burst of callers on a cold cache makes one request rather than one each. Server side only: the grant is the client secret.

  `revoke()` retires a token through the provider's revocation endpoint (RFC 7009), and `logout()` now calls it before forgetting the refresh token. Dropping one without revoking leaves a copy usable for its whole lifetime while the browser believes it signed out.

  `issuer` on the verifier and the introspector accepts a list, for a provider that names itself more than one way. Google publishes both `accounts.google.com` and `https://accounts.google.com`, and a service pinned to one rejected tokens carrying the other. Discovery uses the first.

- 3d2ef96: DPoP, RFC 9449: a token bound to a key the client holds, so a copy taken from storage, a log or a proxy is worth nothing without the key.

  `dpop: true` on a browser config generates a key per client, signs a proof for every token and resource request, presents the token under the `DPoP` scheme rather than `Bearer`, and retries once with a nonce when the provider asks for one. The private half never leaves the process and is not stored, so a reload makes a new key and the session is rebuilt from the refresh token: a page cannot keep a private key safely.

  `dpop: true` on `createTokenVerifier` is the other half, and one without the other is worse than neither. It refuses a token carrying no `cnf.jkt`, and refuses a bound one whose proof was signed with a different key, made for another method or URL, made for another token, or is older than the skew allowance. Verifying a bare string with it set is refused outright rather than silently skipping the check, since a service cannot read a proof it was not given.

  Okta requires this by default for a new client and an integrator org does not allow turning it off, which is what prompted it.

- 2df7274: `credentialsFromEnv` and `explainCredentials` now resolve secrets or private keys from environment variables.
- 04887ea: First release. OAuth2 and OIDC for a Fluixi app, split in two: an `AuthClient` that drives the protocol (PKCE, the authorization redirect, the code exchange, refresh and end-session) and an `AuthService` built on `@fluixi/session` that owns the user, the status and the refresh schedule. The service depends on the client and not on which one, so the same application code runs in either mode.

  `tokens: 'browser'` is a public client holding its own tokens, which needs no server. `tokens: 'server'` keeps them on the app's own server behind an httpOnly cookie, using the routes from `@fluixi/oauth2/server`. Endpoints come from OIDC discovery when given an issuer. The service satisfies the session shape `createAuthHooks` takes, so `protectedRoute` and the rest work on top of it unchanged.

- c20d559: The subpath `@fluixi/oauth2/roles` now exports `rolesFrom`, so importing `./presets` or `./env` no longer bundles the token verifier into the browser.
- 99bfe8a: Client authentication is one implementation rather than four. It was built separately in the browser client, the server routes, the service client and the introspector, which is how `tokens: 'server'` came to lack `private_key_jwt` while two other paths had it: a method was added where it was demanded instead of once. Every authenticated call now shares `client-auth.ts`, so `oauthRoutes` can authenticate with a signed assertion and a method added later reaches all of them.

  The methods take their names from `token_endpoint_auth_methods_supported`, so a provider's discovery document and an app's configuration say the same words: `client_secret_basic`, `client_secret_post`, `private_key_jwt`, `none`. The shorter `basic` and `body` still work.

  A configuration is checked when a client is built rather than on its first request, and the credentials grant refuses a public client outright, since that grant is the credential.

- 77dd807: `clientAuthMethod: 'private_key_jwt'` authenticates a service by signing a short-lived assertion with a key the provider holds the public half of, so no shared secret travels. Available on `createServiceClient` and `createTokenIntrospector`, with `privateKey` as a JWK.

  Not a preference everywhere: Okta's org authorization server refuses client credentials with anything else, and FAPI requires it. The assertion names the endpoint as its audience so it cannot be replayed elsewhere, carries a fresh `jti` so it cannot be replayed there, and lives one minute.

- a7f506e: `@fluixi/oauth2/presets` now provides OIDC and OAuth2 presets for any provider along with five named providers, fixing the issuer spelling, roles claim and provider refusal details.
- 9e6e22a: A server-held session can retire its tokens. `revoke()` existed only on the browser client, so calling it in `tokens: 'server'` did nothing at all: the browser holds a cookie and no token, and there was no route to ask. `oauthRoutes` now serves `/revoke`, which opens the cookie and revokes what is inside, and `logout` revokes the refresh token before clearing the cookie rather than leaving a copy usable for its whole lifetime.

  A provider publishing no revocation endpoint answers 501 rather than reporting success, since a silent success leaves the token live while the caller believes otherwise.

- 48ae001: `sessionLocals` reuses a userinfo response for a short window instead of asking the provider on every server render, which made the provider being up a condition of rendering at all. `userCacheMs` sets the window and `0` turns it off; entries are keyed by access token, a refusal is never cached, and the store is bounded.

  The package documents where trust comes from: why the client does not verify token signatures, why identity is a userinfo round trip rather than a decoded token, and why signature verification belongs at the resource server with an audited library.

- 7b8108f: `createTokenIntrospector` verifies a token the service cannot read, over RFC 7662. A provider may issue an opaque reference token rather than a JWT, and there is no way to check one locally, so the service asks the provider instead. It returns the same shape as `createTokenVerifier`, so a guard written against one works with the other.

  What that buys is the property a signature cannot give: a revoked token is refused at once rather than staying valid until it expires. What it costs is a request to the provider per call, so `cacheMs` defaults to zero and a refusal is never cached. Client credentials are required, because an unauthenticated introspection endpoint would let anyone test a stolen token.

  Discovery now carries `introspection_endpoint` on `Endpoints`.

- ddf63f7: `@fluixi/oauth2/verify` checks an access token at the service that receives it. `createTokenVerifier({ issuer, audience })` returns a function taking a token or a `Request` and giving back its claims, with the JWKS found through discovery. Nothing in it is Fluixi-specific, so an Express service, a worker or a plain handler can import it on its own.

  The cryptography is `jose`'s, an optional peer loaded only when something verifies. What this adds is the configuration around it: algorithms pinned rather than read from the token, an issuer and audience that have to be stated, and `authorizedParty` for a provider that puts no `aud` on its access tokens and names the client in `azp` instead, which is what Keycloak does until an audience mapper is configured.

- 689e13c: `userInfo` says where the user comes from when it is not the provider's OIDC userinfo. `url` points at an app's own endpoint, `map` turns whatever it returns into the shape the app wants, and `headers`, `credentials` and `method` cover an API with its own requirements. Replacing `fetchUser` wholesale still works for anything this does not reach.

  The OIDC subject check applies only to the provider's own userinfo. An app endpoint answers in its own shape and carries no `sub` to compare, so applying it there would reject every custom endpoint.

### Patch Changes

- d929314: `authorizedParty` reads `client_id` as well as `azp`. Some providers name the client a token was issued to in `client_id` rather than the OIDC claim, Cognito among them, and those tokens carry no `aud` either, so every one of them was rejected. The introspection path already read both.
- 41c35a7: A conformance suite under `conformance/` runs the same checks against any provider from a small config block: discovery, the client credentials grant, token shape, the authorization code flow, userinfo, JWKS verification, introspection and revocation. It reports what must hold separately from what a provider may legitimately lack, so an absent revocation endpoint reads as a fact to document rather than a failure.

  Keycloak and Dex both pass. Dex has no client credentials grant and no revocation endpoint, which is what the capability rows are for. Configs with setup instructions are included for Auth0, Okta, Entra and Google, which need an account before they can run.

- 522f38a: A discovery document that cannot be read now says why. In a browser a refused cross-origin read throws before any status exists and `fetch` reports only "Failed to fetch", which reads as a network fault. Not every provider lets a page read its own document: Keycloak does once an origin is configured, Dex and Google do not. The error now names that as the likely cause and points at the two ways around it, giving `endpoints` directly or resolving them on a server.
- 391ff8b: A token request refused for want of a DPoP proof now says what that means. `invalid_dpop_proof` and `use_dpop_nonce` carry no meaning on their own, and Okta turns the requirement on by default for new applications, so it is met before anything is actually misconfigured. The message names RFC 9449, says the package does not implement it, and gives the two ways forward.
- b43b671: The DPoP key now persists in IndexedDB instead of a variable, ensuring refresh tokens remain bound across page loads.
- 617d494: Introspection now names the key and passes the provider's reply through when a request is refused.
- d803fe6: An app can run more than one provider. A client's stored values are namespaced by its `clientId`, or by `storageKey` when two clients share a provider; they used to share one set of keys, so starting a second login overwrote the first's verifier and state. `tokenAuthMethod: 'basic'` sends the client credentials in an `Authorization` header for providers that require it, rather than in the form.

  `sessionLocals` puts the signed-in user on request locals for `tokens: 'server'`, which is what lets a server render know who is looking. There is no browser-mode equivalent: the token never leaves the browser, so the server has no credential to resolve.

- f5cee12: A callback route no longer fails its server render. `paramsFromUrl` read `location.href`, which does not exist on the server, so the route threw before the browser could finish the exchange. It now returns nothing there, and `complete()` says plainly that it runs in the browser, where the authorization code and the PKCE verifier both are.
- b43b671: Only `invalid_grant` errors now clear the stored refresh token.
- 7fffc39: A login can no longer be made to land on another origin. The destination a flow carries so a visitor resumes where they were interrupted arrives from outside: `?returnTo=` on the login route, a caller's argument, a value read back out of browser storage. It was honoured unchecked, so a link carrying `?returnTo=https://evil.example.com/` sent an authenticated visitor there with a live session, which is the worst place for an open redirect: they have just proved who they are and trust the page they arrive on.

  Sealing the value into a signed cookie did not help and was the reasoning that let this through. A cookie that cannot be tampered with is not the question when the application seals the attacker's value itself.

  `safeReturnTo` now decides, and is applied where a destination enters a flow and again where it is used: a path on this origin is kept, anything else falls back. Refused are another origin, `//host` and `\\host` which a browser reads as one, any non-http scheme so `javascript:` cannot be reached, a control character used to smuggle past a check, a bare word, and a lookalike such as `https://app.example.com.evil.test`. `allowedReturnOrigins` names further origins for an application that genuinely spans several, compared as whole origins rather than by prefix.

- 90718c0: `revoke()` says what happened. It had three silent returns, for no token to revoke, no revocation endpoint, and a refusal from the provider, which made a revocation that did nothing indistinguishable from one that worked. Each now throws with the reason, and a revoked refresh token is forgotten so a later refresh fails for the right cause.

  `logout()` still ignores a failed revocation, which is the one place it should: a provider that cannot revoke must not stop someone signing out.

- 73bf352: `@fluixi/session/server` holds a session the browser cannot read: `createSessionCookie` seals a value into an httpOnly cookie with AES-GCM through Web Crypto, and reads it back. It is not an auth system and does not know what a user is, which is what lets an app with its own database seal a user id, and `@fluixi/oauth2` seal tokens, over the same piece.

  `@fluixi/oauth2/server` now uses it rather than carrying its own copy of the cookie and crypto handling.

- c5d86e8: The userinfo response is now checked against the id token's subject before it is used, which OIDC requires: a response obtained for one subject must not be read as another. A provider that issues no id token has nothing to compare against and is unaffected.

  A signed userinfo response is reported as one rather than failing inside a JSON parse, and a refused token now carries the reason the provider gave in `WWW-Authenticate` instead of only a status code.

- Updated dependencies [54b8466]
- Updated dependencies [190493a]
- Updated dependencies [655c5d2]
- Updated dependencies [79bd79f]
- Updated dependencies [567484f]
- Updated dependencies [734d7e0]
- Updated dependencies [73bf352]
- Updated dependencies [7bc3e64]
- Updated dependencies [5a7e92a]
- Updated dependencies [f388d49]
- Updated dependencies [337a424]
- Updated dependencies [18d3696]
- Updated dependencies [a6cac6f]
- Updated dependencies [6f26bee]
- Updated dependencies [52388aa]
- Updated dependencies [29a639b]
- Updated dependencies [29a639b]
- Updated dependencies [d7d4089]
- Updated dependencies [d6c8562]
  - @fluixi/start@0.1.0-alpha.77
  - @fluixi/core@1.0.0-alpha.87
  - @fluixi/auth@1.0.0-alpha.87
  - @fluixi/server@1.0.0-alpha.87
  - @fluixi/session@1.0.0-alpha.87
  - @fluixi/reactive@1.0.0-alpha.87
