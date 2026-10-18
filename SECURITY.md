# Security

Fluixi renders pages on the server and in the browser, and its packages handle sessions, OAuth 2
tokens and form data for the apps built on it. A flaw here reaches every one of those apps.

## Reporting a vulnerability

Report it privately through GitHub: the repository's **Security** tab, then **Report a
vulnerability**. Please do not open a public issue, pull request or discussion for it.

A useful report has:

- the package and version (`@fluixi/...@1.0.0-alpha.N`);
- the smallest code that shows it, and the steps to reproduce;
- what an attacker gains: script injection through rendering or hydration, a session or token
  read or reused, a redirect to another site, a server request to an address it should not reach.

You get an answer in the advisory thread. Once a fix is released, the advisory is published with
credit to you, unless you prefer otherwise.

## Supported versions

Fluixi is in alpha. Fixes go into the latest alpha only; upgrade to it to receive them.

## In scope

The packages published from this repository under `@fluixi/`, among them `core`, `dom`,
`compiler`, `start`, `server`, `router`, `session`, `auth` and `oauth2`.

Not in scope: an app's own code, including unsafe use of what the framework documents as unsafe,
and the examples and playgrounds in this repository, which are not meant to be deployed.
