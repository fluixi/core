---
"@fluixi/compiler": patch
---

HTML templates now decode character references like `&nbsp;`, `&amp;`, `&copy;`, and numeric references in text and static attributes, the same set JSX accepts.
