---
"@fluixi/template-parser": patch
---

`<div><span>x</div>` now reports Unclosed `<span>`, the element left open; before, it named the `<div>`, whose closing tag the `<span>` had taken.
