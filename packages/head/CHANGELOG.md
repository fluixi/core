# @fluixi/head

## 1.0.0-alpha.23

### Patch Changes

- Updated dependencies [59ddb69]
  - @fluixi/reactive@1.0.0-alpha.56

## 0.1.0-alpha.22

### Patch Changes

- Updated dependencies [5cfb7a6]
- Updated dependencies [daa7af2]
  - @fluixi/reactive@1.0.0-alpha.55

## 0.1.0-alpha.21

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/reactive@1.0.0-alpha.54

## 0.1.0-alpha.20

### Patch Changes

- Updated dependencies [9b06063]
  - @fluixi/reactive@1.0.0-alpha.53

## 0.1.0-alpha.19

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.52

## 0.1.0-alpha.18

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.51

## 0.1.0-alpha.17

### Patch Changes

- f93989f: Fix page content duplicated on hydration when `seo()`/`useHead()` is used in dev.

  `@fluixi/head` carries a page's SEO back from SSR as an inert `<!--fh:…-->` comment prepended to the body; the server lifts it into `<head>` and strips it via `injectAppAndHead`. The prod adapter and prerender did this, but the dev server used plain `injectApp`, leaving the marker as the mount root's first child. The hydration cursor started on that comment, never matched the app's first element, and rebuilt the whole tree next to the server DOM — a duplicated page. (Dev also emitted no head tags as a result.)

  Dev now uses `injectAppAndHead`, so the marker is lifted into `<head>`/`<html>` exactly like prod. As a safety net for streaming/custom servers, `stripHeadMarker` drops any stray leading `fh:` comment on the client before hydration.

  - @fluixi/reactive@1.0.0-alpha.50

## 0.1.0-alpha.16

### Patch Changes

- 6620476: Add `@fluixi/reactive` to devDependencies on `@fluixi/head` and remove it has a direct dependency
  - @fluixi/reactive@1.0.0-alpha.49

## 0.1.0-alpha.15

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.48

## 0.1.0-alpha.14

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.47

## 0.1.0-alpha.13

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.46

## 0.1.0-alpha.12

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.45

## 0.1.0-alpha.11

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.44

## 0.1.0-alpha.10

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.43

## 0.1.0-alpha.9

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
- Updated dependencies [3f0e665]
  - @fluixi/reactive@1.0.0-alpha.42

## 0.1.0-alpha.8

### Patch Changes

- Updated dependencies [82606b9]
  - @fluixi/reactive@1.0.0-alpha.41

## 0.1.0-alpha.7

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.40

## 0.1.0-alpha.6

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.39

## 0.1.0-alpha.5

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.38

## 0.1.0-alpha.4

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.37

## 0.1.0-alpha.3

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.36

## 0.1.0-alpha.2

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.35

## 0.1.0-alpha.1

### Minor Changes

- bec9d21: New `@fluixi/head` — built-in reactive, SSR-first SEO/document-head engine. Typed title/meta/OG/Twitter/JSON-LD/canonical/hreflang/icons/verification, last-wins dedupe with nested layout inheritance, SSR serialize + client reconcile (reuses server tags by key, no hydration mismatch, signals update the document live), JSON-LD helpers, head components, and robots.txt/sitemap.xml generators.

  Re-exported as `@fluixi/start/head` (same pattern as `@fluixi/start/router`) so apps have one import surface.

- 6f8a9d4: Wire @fluixi/head into the framework (zero-config SEO). renderRequestAsync collects seo()/useHead metadata during SSR and carries it back; @fluixi/start lifts it into <head>/<html> for SSR + prerender. startClient mounts the head registry so it hydrates (server tags reused by key) and updates live, including on route transitions (seo() auto-disposes on owner unmount). Apps just call seo({...}) — no setup.

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.34
