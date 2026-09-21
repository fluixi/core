---
"@fluixi/oauth2": patch
---

An app can run more than one provider. A client's stored values are namespaced by its `clientId`, or by `storageKey` when two clients share a provider; they used to share one set of keys, so starting a second login overwrote the first's verifier and state. `tokenAuthMethod: 'basic'` sends the client credentials in an `Authorization` header for providers that require it, rather than in the form.

`sessionLocals` puts the signed-in user on request locals for `mode: 'server'`, which is what lets a server render know who is looking. There is no browser-mode equivalent: the token never leaves the browser, so the server has no credential to resolve.
