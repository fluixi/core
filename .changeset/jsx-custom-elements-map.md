---
"@fluixi/jsx": major
---

The JSX custom element tags are now registered on the `JSXCustomElements` interface instead of `HTMLReactiveElement` or `FluixiElements`. Rename any augmentations that reference `HTMLReactiveElement` or `FluixiElements` to use `JSXCustomElements`.
