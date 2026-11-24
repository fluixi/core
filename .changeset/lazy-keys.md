---
"@fluixi/core": patch
---

A lazy component now opens its hydration key scope regardless of whether its module was already loaded, ensuring consistent hydration depth between server and browser.
