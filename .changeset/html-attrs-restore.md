---
"@fluixi/head": patch
"@fluixi/start": patch
---

`seo()` now restores `<html>` attributes such as `lang` and `htmlAttrs` to their original values when the page that set them is removed, and on initial load the server records the template's original `<html>` values in a `data-fh-original` attribute.
