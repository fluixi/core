---
"create-fluixi": patch
"@fluixi/reactive": patch
---

Generated apps use the `$signal`/`$resource` intrinsics, navigate with `<Link>` rather than `<a href>`, and ship a `fluixi.d.ts` so an editor knows the intrinsics before the app has been run. The fluixi-css stylesheet now carries `@fluixi base/utilities/components` and its own `@theme`, so no `fluixi.css.config.js` is generated. `resource()` accepts the single-fetcher form again: it borrowed its parameters from `createResource`, which collapses an overloaded function to its last signature.
