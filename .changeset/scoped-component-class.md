---
"@fluixi/compiler": patch
---

A component such as `Card` with a class, className or classList inside a component with `<style scoped>` receives the scope attribute and the class is passed so the scoped rule applies. Components without a class continue to render without a scope attribute as before.
