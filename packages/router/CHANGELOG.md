# @fluixi/router

## 0.1.2-alpha.1

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`

## 0.1.2-alpha.0

### Patch Changes

- 076dbb4: Tolerate a trailing slash when matching routes. Static hosts (e.g. Cloudflare Pages) canonicalise `/a/b` to `/a/b/`; leaf routes match exactly, so the stray slash matched nothing and rendered an empty root after hydration. The matcher now strips a trailing slash (root `/` preserved).

## 0.1.1

### Patch Changes

- aa028bd: Include `src` in the published tarball (like the other `@fluixi/*` packages).
  Consumers that resolve `@fluixi/*` via the `development` export condition (the
  TypeScript source — used in dev to keep a single reactive instance) were failing
  on `@fluixi/router` / `@fluixi/utils` with "Failed to resolve entry".

## 0.1.0

### Minor Changes

- 03ee85a: Framework-agnostic router (`@fluixi/router`) + kettlejs `router-next` adapter.

  - New `@fluixi/router` package: pure routing core — `matchRoutes` / `matchPath`,
    history adapters, and a `createRouter` state machine. No reactivity or DOM, so
    any view layer can sit on top.
  - `@fluixi/kettlejs/router-next`: kettlejs adapter that renders the resolved match
    tree top-down, fixing deeply-nested `<Outlet/>`. Full API parity with the old
    router (`useParams` / `useParam` / `useParamSelector` / `useMatch` /
    `useSearchParams` / `useLocation` / `useNavigate` / `select` / `Redirect` /
    `Link`). Routes with a `data` loader gate on resolved data, so `useRouteData()`
    works without a Suspense boundary.
