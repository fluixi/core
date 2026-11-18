---
"@fluixi/start": patch
---

The image endpoint now finds `sharp` installed by the app under a strict layout (pnpm), serves resized images while keeping the source encoding (a PNG stays a PNG with its transparency and an SVG passes through), and caps the request `q` at the configured quality.
