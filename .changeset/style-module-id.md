---
"@fluixi/compiler": patch
---

An edited `<style>` block now updates in the dev server, and a style requested before its component's imports were analyzed no longer keeps its old CSS until the dev server restarts.
