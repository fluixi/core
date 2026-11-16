---
"@fluixi/compiler": patch
---

`props` destructuring at the top of a component body now remains reactive and is treated as a destructured parameter, and a build warning is emitted when a props destructure runs only once during setup (such as inside an if block or shared const).
