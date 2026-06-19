---
"@fluixi/kettlejs": minor
---

Retire the old `@fluixi/kettlejs/router`. `router-next` (the framework-agnostic
`@fluixi/router` core + its kettlejs adapter) is now the only router, and it already
covered every real feature — hooks (`useRouter`/`useLocation`/`useNavigate`/`useParams`/
`useParam`/`useParamSelector`/`useMatch`/`useSearchParams`/`select`), the data layer
(`cache`/`action`/`revalidate`/`createAsync`/`useSubmission`/`useAction`/`useRouteData`),
`Outlet`/`Link`/`A`/`Redirect`, lazy routes, and nested layouts.

The old router was the last lit-coupled module in the core (its `<Router>`/`<Routes>`/
`<Route>` JSX imported `html` from `@fluixi/lit`), so removing it takes lit fully out of
the router path too.

Changes:
- Removed the `./router`, `./router/index`, and `./router.js` package exports and the
  `router/{router,rt,fs-router,index}.ts` implementation.
- Moved the shared route-data layer to `router-next/data.ts` (it's re-exported from
  `@fluixi/kettlejs/router-next`); added a `runWithOwner` re-export there for parity.

BREAKING: import routing from `@fluixi/kettlejs/router-next` instead of
`@fluixi/kettlejs/router`. The declarative `<Routes>`/`<Route>` JSX is replaced by the
`routes` prop: `<Router routes={routes} />` (wrap in `<Suspense>` for lazy routes). The
dead `createFileRoutes`/fs-router helper is gone (file routing is the `kettleRoutesPlugin`
+ `virtual:kettle-routes`).
