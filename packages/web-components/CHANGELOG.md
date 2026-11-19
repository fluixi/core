# @fluixi/web-components

## 1.0.0-alpha.110

### Minor Changes

- d3417c8: Element renders now keep their state under `keepState` and a class redefined by hot reload gets the new methods, causing instances to re-render.
- b2a1a0b: In dev, an element redefined by hot reload now takes the new setup and its instances on the page rebuild, keeping their props.

### Patch Changes

- de565d1: A string assigned to a `prop.any` prop is now kept as is again.
- b6db4f8: On the server, an element that writes `dataset`, `style`, `classList` or attributes from render now writes them into the HTML and `attachInternals` is accepted.

## 1.0.0-alpha.109

### Minor Changes

- 2db6afe: Light DOM elements now have `slotted(name)` to retrieve light-DOM children marked with `slot="name"` or those without a slot, to place in `render()`.

### Patch Changes

- c530572: The library now builds with mix-builder 0.4.3, sharing chunks across ES module entries so each module and its state appears only once and the published ES module files are 50-80 % smaller, with CDN globals using a single copy of the signal graph.
- 34ccbfa: A custom element now parses string literals on typed props as their attribute values, so a number prop receives 2 instead of `"2"` while string props remain unchanged.
- 7ac76c1: Static-attribute custom elements, elements defined with `defineElement`, and `slotted(name)` now render correctly on the server, and after hydration children placed between server-rendered tags appear where `render()` puts them, with a new `afterHydrationPass(fn)` API available.

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

### Patch Changes

- 3ed276b: Fluixi peer dependencies are published as ^ ranges (^1.0.0-alpha.N) instead of exact versions.

## 1.0.0-alpha.98

### Patch Changes

- Updated dependencies [86e38e1]
  - @fluixi/dom@1.0.0-alpha.98
  - @fluixi/reactive@1.0.0-alpha.98

## 1.0.0-alpha.97

### Minor Changes

- b7faba4: First release: custom elements with reactive props, events, slots and styles, usable from plain HTML, React, Vue and Svelte. The package is versioned with `@fluixi/core` from this release on.

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.97
- @fluixi/dom@1.0.0-alpha.97
