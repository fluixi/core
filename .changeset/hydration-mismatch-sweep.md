---
"@fluixi/dom": patch
"@fluixi/core": patch
---

Hydration now builds the client's template when the server rendered a different one at that position and removes any server elements that were not claimed.
