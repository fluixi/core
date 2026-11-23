---
"@fluixi/compiler": minor
"@fluixi/dom": minor
---

Components now compile to direct `createComponent` calls instead of a memo wrapper, and each read of `props.children` rebuilds the children; read `props.children` once into a local variable or use `readChildren(() => props.children)`. Development builds warn when a component reads it twice in one turn.
