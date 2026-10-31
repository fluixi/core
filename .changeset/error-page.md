---
"@fluixi/start": minor
---

When an error is thrown by a page, server function, or middleware on a production server, the error is logged and the visitor receives a 500 response with a plain HTML page or the text "Internal Server Error" for non-page requests, never the stack trace; an application can provide its own error page via `public/error.html`; the Fluixi development environment continues to display the stack trace.
