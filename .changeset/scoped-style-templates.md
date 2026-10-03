---
"@fluixi/compiler": minor
---

Templates with `<style>` and `<style scoped>` now compile like the JSX form, extracted, processed by the host's CSS engine, scoped, and returned in `styles`, and each component now receives a single id shared across its JSX and template blocks, with a custom element's render() blocks belonging to the class name.
