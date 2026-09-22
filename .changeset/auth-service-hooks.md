---
"@fluixi/oauth2": minor
---

`createAuthService` returns the guards as well as the session: `protectedRoute`, `Can`, `Protect`, `useAuth`, `useUser` and `useCan` come back on the service, so an app declares its authentication once instead of wiring `createAuthHooks` to it in a second file. `navigate`, `loginPath`, `homePath` and `forbiddenPath` move onto the same options object.
