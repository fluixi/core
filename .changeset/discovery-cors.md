---
"@fluixi/oauth2": patch
---

A discovery document that cannot be read now says why. In a browser a refused cross-origin read throws before any status exists and `fetch` reports only "Failed to fetch", which reads as a network fault. Not every provider lets a page read its own document: Keycloak does once an origin is configured, Dex and Google do not. The error now names that as the likely cause and points at the two ways around it, giving `endpoints` directly or resolving them on a server.
