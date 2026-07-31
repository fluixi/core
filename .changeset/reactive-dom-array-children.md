---
'@fluixi/dom': patch
---

Fix accessor typeof checking to also identify reactive arrays using `isReactiveArray` on `insert()` so `accessor` could reach effect if it's potentially an array containg
reactive values
