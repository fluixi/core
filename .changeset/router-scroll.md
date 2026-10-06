---
"@fluixi/router": patch
"@fluixi/core": patch
---

Client navigation now opens the new page at the top or at its #hash, back and forward return you to your previous scroll position, reload preserves the position, replace on the same page leaves the scroll unchanged, and locations now include a key and action while browser history stores the key alongside the app's state.
