---
"@fluixi/utils": minor
"@fluixi/auth": minor
---

The cookie codec now resides at `@fluixi/utils/cookie` and `@fluixi/auth` re-exports it, so imports from `@fluixi/auth` continue to work. Update any code that writes cookies to avoid invalid names, paths, or domains containing `;` or whitespace (which now throw a `TypeError`). `SameSite=None` now always adds Secure, and `parseCookies` keeps a malformed escape as raw text instead of throwing.
