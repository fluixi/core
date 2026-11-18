---
"@fluixi/start": patch
---

The build now refuses to publish env names ending in `TOKEN`, `API_KEY`, `APIKEY`, `DSN`, `DATABASE_URL` or `SECRETS` (e.g., `GITHUB_TOKEN`, `STRIPE_API_KEY`), while `TOKEN_ENDPOINT` still passes.
