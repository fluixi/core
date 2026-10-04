---
"@fluixi/devtools": patch
---

Reading a component's props no longer leaves running what a prop getter built, so the Show fallback read by the panel no longer throws repeated context errors.
