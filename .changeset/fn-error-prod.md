---
"@fluixi/start": patch
---

A server function error now results in a 500 Internal Server Error with no message in the response in production, while development still shows the message and 4xx errors remain unchanged.
