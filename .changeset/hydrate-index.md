---
"@fluixi/dom": patch
---

Hydration now works for `Index` too (same fix as `For` in the previous release):
each item ascends the hydration cursor past its rendered node so server list
items are reused instead of rebuilt. `Index` SSR was already correct — this was a
missing-ascend hydration bug, not a server-render one.
