---
"@fluixi/auth": minor
"@fluixi/cli": minor
---

Less auth boilerplate + proper cookies + a CLI generator.

- **`createAuthHooks({ session })`** — drive the hooks from an existing reactive session
  (e.g. `@fluixi/session`) instead of a Better Auth client. The framework owns the reactive
  sync, so apps stop hand-writing a `createEffect` to mirror their store into the auth hooks
  (`useUser`/`protectedRoute`/`useSignIn` derive from `session.user`/`login`/`logout`).
- **Cookie API** (from `@fluixi/auth/server`) — `parseCookies`, `serializeCookie`
  (secure-by-default: HttpOnly, Secure, SameSite=Lax, Path=/), `deleteCookie`, and
  request-scoped `getCookie`/`getCookies`.
- **`fluixi generate auth`** — scaffolds `auth.config.ts`, `auth.client.ts`, `src/middleware.ts`,
  and the `/api/auth/[...all]` route in one command.
