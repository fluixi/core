---
"@fluixi/dom": patch
"@fluixi/core": patch
---

`load:` deferred components now retain their server-rendered content during hydration until the component code loads, and components can return `keepServerContent` while hydrating to preserve their slot content.
