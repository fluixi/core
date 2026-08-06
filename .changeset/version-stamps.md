---
"@fluixi/core": minor
"@fluixi/dom": minor
"@fluixi/reactive": minor
---

Report the real package versions on the mount element and `window.Fluixi`

`container.setAttribute('fluixi-js', 'v1')` said only that Fluixi was involved. The mount
element now carries which build of each package is running:

```html
<div id="app" fluixi="1.0.0-alpha.68" fx-dom="1.0.0-alpha.68" fx-reactive="1.0.0-alpha.68">
```

and the same is on `window.Fluixi` for the console:

```js
{ core: '1.0.0-alpha.68', dom: '1.0.0-alpha.68', reactive: '1.0.0-alpha.68' }
```

Three attributes rather than one because the packages are resolved separately even though
they release together. A stale lockfile or a duplicated install can pair one version of
the DOM runtime with another of the signal core, which surfaces as reactivity behaving
inexplicably — so a mismatch now also warns once at mount, naming the versions and
suggesting `pnpm why @fluixi/dom`.

`@fluixi/core`, `@fluixi/dom` and `@fluixi/reactive` each export `VERSION`, generated into
`src/version.generated.ts` at build time from their own `package.json`. Generated rather
than imported: bundlers and ESM resolvers treat a manifest import inconsistently, and it
would pull the whole file in for one string.
