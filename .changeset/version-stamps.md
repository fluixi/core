---
"@fluixi/core": minor
"@fluixi/dom": minor
"@fluixi/reactive": minor
---

Report the running package versions on the mount element and `window.Fluixi`

The mount element now carries which build of each package is running:

```html
<div id="app" fluixi="1.0.0-alpha.68" fx-dom="1.0.0-alpha.68" fx-reactive="1.0.0-alpha.68">
```

and the same is available in the console:

```js
window.Fluixi // { core: '…', dom: '…', reactive: '…' }
```

It replaces `fluixi-js="v1"`, which said only that Fluixi was involved.

Three attributes rather than one because the packages are resolved separately even though
they release together. A stale lockfile or a duplicated install can pair one version of the
DOM runtime with another of the signal core, which surfaces as reactivity behaving
inexplicably — so a mismatch also warns once at mount, naming the versions.

`@fluixi/core`, `@fluixi/dom` and `@fluixi/reactive` each export `VERSION`.
