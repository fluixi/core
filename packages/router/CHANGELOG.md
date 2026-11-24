# @fluixi/router

## 1.0.0-alpha.113

## 1.0.0-alpha.112

## 1.0.0-alpha.111

## 1.0.0-alpha.110

## 1.0.0-alpha.109

### Patch Changes

- c530572: The library now builds with mix-builder 0.4.3, sharing chunks across ES module entries so each module and its state appears only once and the published ES module files are 50-80 % smaller, with CDN globals using a single copy of the signal graph.

## 1.0.0-alpha.108

## 1.0.0-alpha.107

## 1.0.0-alpha.106

## 1.0.0-alpha.105

## 1.0.0-alpha.104

## 1.0.0-alpha.103

## 1.0.0-alpha.102

## 1.0.0-alpha.101

## 1.0.0-alpha.100

## 1.0.0-alpha.99

## 0.1.2-alpha.5

### Patch Changes

- f4528b2: Client navigation now opens the new page at the top or at its #hash, back and forward return you to your previous scroll position, reload preserves the position, replace on the same page leaves the scroll unchanged, and locations now include a key and action while browser history stores the key alongside the app's state.

## 0.1.2-alpha.4

### Patch Changes

- aa17d01: `@fluixi/cli`, `@fluixi/devtools`, `@fluixi/head`, `@fluixi/router`, `@fluixi/server`, and `@fluixi/start` now provide bundled builds with import resolving to a `.mjs` file and a require condition resolving to a `.cjs` file, and `@fluixi/core` and `@fluixi/compiler` now include the copyright banner in their subpath exports.

## 0.1.2-alpha.3

### Patch Changes

- 5cfb7a6: Add a `description` field to packages that were missing one. Without it, npm's profile/list view fell back to the first README line — the raw `<p align="center">` logo block — instead of a summary.
- daa7af2: Update READMEs for public npm: drop the GitHub Packages `.npmrc` install instructions (no auth needed on public npm) and replace the GitHub Packages registry badge with an npm version badge.

## 0.1.2-alpha.2

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.

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
