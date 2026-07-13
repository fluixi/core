---
"@fluixi/compiler": minor
---

Auto-import router components. Using `<Router>`, `<Outlet>`, `<Redirect>` or `<Link>` in a
template (html`` or JSX) now injects the import from the router module if it isn't already
bound — the same ergonomics as control-flow components (`<Show>`/`<For>`/…). Configurable
via the `routerModule` option (default `@fluixi/core/router-next`). `Routes` isn't a
component (routing is `<Router routes={…}>`) and `lazy` is a function call rather than a
tag, so those aren't auto-imported.
