---
"@fluixi/dom": patch
---

Each DOM binding now reports the element and the attribute or content it writes, along with the accessor it reads, as it is wired up. Only the DOM layer can know what a signal's reader is, such as the text of an `<li>` rather than a `class`, and the accessor is included because the compiler may have stamped it with the line the hole was written on.
