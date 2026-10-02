---
"@fluixi/dom": patch
---

Page hydration now steps over a custom element that rendered its own content on the server, so elements after it are adopted instead of being built a second time.
