---
"@fluixi/auth": minor
---

The `signedIn()` and `member({ roles, permissions })` guards are now available in `@fluixi/auth/server` for protecting `@fluixi/api` routes, with `member()` providing `auth.member.organizationId` and returning 403 errors `no_active_organization` or `not_a_member`, and `AuthError` now includes an optional `code`.
