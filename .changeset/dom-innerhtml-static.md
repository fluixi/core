---
"@fluixi/dom": patch
"@fluixi/jsx": patch
---

fix: support a static (non-function) `innerHTML` prop. The client handler always called the value
as an accessor (`val()`), so a plain string like `innerHTML="<b>x</b>"` threw — and during
hydration it wiped the element's content. It now sets a string directly and only wraps a function
in an effect. `@fluixi/jsx` types `innerHTML` as `string | (() => string)` to match.
