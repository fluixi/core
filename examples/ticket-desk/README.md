# Ticket Desk

## what it is

A support desk implementation that demonstrates the full @fluixi/start feature set with real behavior and tests. It includes dependency injection, middleware, API routes, reactive state, server functions, fetch interceptors, SEO, and client route guards.

## how to run

```bash
pnpm dev   # runs on port 3200
pnpm build
pnpm start
pnpm test
```

## feature coverage table

| Feature                     | File(s)                              | Test file                |
|-----------------------------|--------------------------------------|--------------------------|
| dependency injection        | src/services/*                       | tests/di.spec.ts         |
| request middleware          | src/middleware.ts                    | tests/middleware.spec.ts |
| file api routes             | src/api/**                           | tests/api.spec.ts        |
| reactive service state      | src/services/ticket-repo.ts          | tests/reactivity.spec.ts |
| server functions            | src/actions.ts                       | —                        |
| fetch interceptors          | src/entry-client.tsx                 | —                        |
| seo and json-ld             | src/app.tsx and the routes           | —                        |
| client route guards         | src/services/auth-hooks.ts           | —                        |

The suite runs **52 tests across four files**. Verified test counts are: di 14, middleware 13, api 16, reactivity 9.

## access-control layers

1. **Middleware** stops the request before server-side rendering and serves as the enforcement boundary.  
2. **protectedRoute** covers client navigation, where no HTTP request occurs, ensuring UI-level protection.  
3. **Server functions and API handlers** re-check the role because callers can invoke them directly, providing a second line of defense.

## notes

- An injection context is synchronous, so inject before the first `await`. 
- The store setter's `k1 k2 k3` value arity typechecks but corrupts the state.
