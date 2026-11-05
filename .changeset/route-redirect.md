---
"@fluixi/core": minor
"@fluixi/dom": minor
"@fluixi/start": minor
---

`redirect(to, { status })`, thrown in a route's `routeData`, answers a server render with that status and `Location` before the page is sent, and replaces the address in the browser; a page already streaming redirects from itself. `setResponseRedirect` and `takeResponseRedirect` in `@fluixi/dom` let a host honour it.
