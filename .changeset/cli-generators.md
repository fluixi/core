---
"@fluixi/cli": minor
---

- The `g env` generator now picks environment variables from `env.public` using `pickEnv`.
- The `g module` generator now registers modules in `src/app.config.ts` (or `.server.ts`) and creates the file if it does not exist.
- The `g service` generator now creates a class, a token, and a module.
- The `g api --role` generator now creates a route guarded by `createApiGuard`.
- The `g server-fn` generator now creates a server function file.
- The `g auth oauth2` generator now sets up environment configuration, a service, callback and login routes, a server module, and required environment variables.
- The auth better-auth route now resides in `src/api/auth` instead of `src/routes/api/auth`.
