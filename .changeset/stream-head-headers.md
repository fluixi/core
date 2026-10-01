---
"@fluixi/start": minor
"@fluixi/dom": minor
---

`streamDocument` now returns a `Promise<Response>` and cookies and other headers set while a streamed page renders its shell reach the response, a render failing before the head is sent answers 500, and `appendResponseHeader` takes an optional request.
