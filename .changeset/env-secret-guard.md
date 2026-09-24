---
"@fluixi/start": minor
---

A build refuses to publish a secret. Vite inlines every variable carrying the client prefix into `import.meta.env`, and it does so whether any code reads it or not, so naming one `VITE_API_SECRET` puts the value in the bundle for every visitor. Nothing in an application can undo that and nothing in it looks wrong, which is why this is checked rather than documented.

Names containing `SECRET`, `PASSWORD`, `PRIVATE_KEY` or `CREDENTIALS` fail the build, across every env file an app may carry, with the unprefixed form to use instead. `TOKEN` is deliberately not one of them: `VITE_TOKEN_ENDPOINT` is a URL. `fluixi dev` warns rather than stopping, so the mistake is caught while writing. `FLUIXI_ALLOW_PUBLIC_SECRETS=true` allows a name that only reads like a secret.
