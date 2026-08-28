---
"@fluixi/dom": minor
"fluixi": patch
"@fluixi/server": patch
---

Harden the SSR data transport (`__FX_DATA__`). The resolved resource/seed data is now emitted
as a **non-executable `<script type="application/json" id="__FX_DATA__">`** block instead of an
inline `<script>window.__FX_DATA__=…</script>` assignment. Two wins:

- **CSP-friendly** — it works under a strict `script-src` that forbids inline executable scripts
  (the JSON block is data, not script).
- **No script breakout** — the JSON is escaped with the standard SSR set (`<`, `>`, `&`,
  U+2028, U+2029, matching Next.js), so no string value can close the `<script>` or corrupt the
  parse. `JSON.parse` round-trips the escapes back.

The client reads it through a single `getServerData()` helper (prefers a pre-set
`globalThis.__FX_DATA__` for back-compat, else parses the JSON block) — used by hydration, i18n
locale seeding, and isomorphic state. Confidentiality is still handled by `setDataRedactor`
(strip server-only fields); the payload remains intentionally non-secret — don't put secrets in
it, and don't rely on encoding it (encryption can't secure data you hand the client).
