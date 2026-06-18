---
"@fluixi/dom": patch
---

Dev hydration-mismatch detection now also covers comment markers: `hydrateMarker` warns (dev only) when the server marker at the cursor diverges from what the client expects, matching the existing element/text warnings. Helps diagnose structural SSR/CSR divergence.
