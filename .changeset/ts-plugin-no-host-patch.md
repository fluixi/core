---
"@fluixi/ts-plugin": patch
---

Fix a crash that took down the whole TypeScript language service.

`0.1.0-alpha.2` added shadow files to the program by patching `getScriptFileNames`,
and built a shadow for every file inside that call. tsserver calls it on every
project sync, so this re-entered host machinery and parsed the project on each
call — the service died on startup and VS Code disabled it after five attempts,
taking every JS/TS feature with it.

The host is no longer touched at all, and the plugin still creates no language
service. It only wraps the service it is handed.

Hole type-checking is kept, by a different route: the expressions inside `${…}`
are real expressions in a real file that TypeScript has already bound. The only
thing missing is a contextual type for the callback parameter, so the plugin
supplies the type it already infers for hover and asks the main checker whether
each property access on that parameter holds. Errors land on real source
positions, so nothing needs mapping.

This reports a wrong property on an inferred parameter — `each` items, `ref`
elements, event objects — which is the mistake templates actually produce. It is
not a general type-check of hole contents; that needed the machinery which proved
unsafe to run inside tsserver.

Also reports a signal read without calling it. `${count}` in child position
renders the function object and never updates; `${count()}` is what was meant.
The editor already had this rule for JSX, so html`` templates lacked an
equivalent for the same mistake.

Scoped hard: only a bare identifier, only among the children of a native element,
and only when its type is callable with no required arguments. A component
legitimately receives accessors (`<For each=${items}>`) and a render-prop child is
a function on purpose, so neither is touched.
