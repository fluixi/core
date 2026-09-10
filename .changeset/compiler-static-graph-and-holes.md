---
"@fluixi/compiler": minor
---

`@fluixi/compiler/analyze` now reads a project's reactive graph out of source without running it, and each reactive hole now carries the line it was written on, in development builds only. The source map could not give them because a template is emitted as one overwrite, so its source map holds a single entry for the whole root, making every hole in it trace back to the line the template opens at.
