---
"@fluixi/dom": minor
"@fluixi/server": minor
"@fluixi/start": minor
---

`appendResponseHeader(name, value)` now adds a header, such as Set-Cookie, to the current request's response (merged by @fluixi/start) and returns false if the headers have already been sent or it is called outside a request.
