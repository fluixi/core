---
"@fluixi/compiler": minor
---

An element with static shadow now gets its `<style>` blocks in its shadow root as CSS strings without a scoping attribute, css`` values in static styles are compiled to CSS strings, and light-DOM elements and components remain scoped and served as page stylesheets.
