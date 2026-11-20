# Troubleshooting

What Fluixi prints when something is wrong, what it means, and what to change. Messages start with
`[fluixi]` (or `[fluixi/di]`, `[fluixi/env]`), so they are easy to find in the console or the
terminal.

## Nothing updates

No message, but the page does not change when the state does.

| Cause | Fix |
|---|---|
| A signal read once outside JSX: `const n = count();` then `{n}` | read it where it is shown: `{count()}` |
| An array or object changed in place, then set again | set a new one: `items.set(l => [...l, x])` ([Signals](/v1/en/signals)) |
| A plain `if` or an early `return` in the component body | `<Show>` ([Control flow](/v1/en/control-flow)) |
| A prop destructured inside a nested block | read `props.x` where you use it; the compiler warns about this case (below) |
| A signal read inside `onMount` | `onMount` does not track; use an effect |

## Rendering and hydration

**`[fluixi] hydration mismatch: expected ... but the server DOM has ...`**
The server and the browser rendered different markup at that place. The browser repairs it, but
the cause is usually a value only one side has: `Date.now()`, `Math.random()`, `window`,
`localStorage`, a browser check in the render. Take the value from data, set it in `onMount`, or
wrap the part in `<ClientOnly>`. Shown in dev only.

**`[fluixi] SSR render failed — falling back to client render: ...`** (terminal)
The server render threw, so the page was rendered by the browser instead. Read the error under it.
The usual causes are a browser API used during render (`document`, `window`, `localStorage`), often
inside an effect, which runs on the server too ([Effects](/v1/en/effects)).

**`[fluixi] hydration: removed N server element(s) the client did not render.`**
The browser's first render produced fewer elements than the server's. Same causes as a mismatch.

## The compiler

**`[fluixi] <file>: <Name> is not defined: nothing imports it and no resolve rule supplies it.`**
The tag would render nothing. Import the component, or add a `resolve` rule for its folder
([Component resolution](/v1/en/component-resolution)).

**`` [fluixi] <file>: `name` was left destructured: ... It reads once instead of tracking. ``**
A destructure of `props` the compiler could not rewrite safely (inside a block, sharing a `const`,
reassigned). Read `props.name` where you use it ([Components](/v1/en/components)).

**`[fluixi] <file>: $signal is reserved for the compiler, and this module binds it.`**
A local variable named like an intrinsic hides it. Rename the variable.

**``html`` was not compiled, enable the html format: fluixi({ format: 'html' }).``**
An html`` template reached the browser uncompiled. Enable the format, or load the CDN build that
compiles templates in the page ([CDN](/v1/en/cdn)).

**`html template (12:5): Unclosed <span>`** (build error)
A template's markup is broken; the message names the element left open, at its file position.

## Loading strategies

**`[fluixi] <file>: load:idle has no effect on <Heavy>: Heavy is used as a value here, ...`**
**`[fluixi] <file>: load:never has no effect on <Heavy>: <Heavy> is also rendered without load: in this file, ...`**
A component deferred in one place is used eagerly (or as a value) in the same file, so its code
ships anyway. Defer every use, or move the eager one to another file
([Loading strategies](/v1/en/load-strategies)).

**`'load:visible' needs a literal value`** (build error)
`load:` takes a literal: `load:visible="200px"`, not `load:visible={margin}`.

## Dependency injection

**`[fluixi/di] inject() called outside an injection context (after an await? in an event handler?).`**
`inject()` ran where there is no component, request or injector: after an `await` in the browser,
in an event handler, at module load. Inject during setup and keep the value, or keep the injector
(`getInjector()`) and use `runInInjectionContext()` ([Dependency injection](/v1/en/dependency-injection)).

**`[fluixi/di] No provider for "Token" (...)`**
Nothing provides that token. Add it to an app module's `providers`, call `provide()` in a component
above, or give the token a `factory`.

**`[fluixi/di] provideAppInitializer() was registered after the app started rendering, ...`**
The initializer was registered from a route's module. Register it in `app.config.ts` or the entry,
so it runs before the first render.

## Environment and server code

**`... reads NAME in code the browser runs`** (build or dev error)
Browser code reads a variable that is not in `env.public`. Declare it public if it may be seen,
or read it on the server (an API route, a server function, a `*.server.ts` file)
([Environment](/v1/en/environment)).

**`[fluixi/env] NAME is listed in env.public, which puts the value in the browser bundle.`** (refused)
A public name reads like a secret. Remove it from `env.public` and read it with `serverEnv()` on
the server. If it only looks like one, set `FLUIXI_ALLOW_PUBLIC_SECRETS=true`.

**`... imports src/.../db.server.ts into the browser bundle.`** (build error)
A `*.server.*` file was imported from browser code. Import it from an API route, middleware,
`src/app.config.server.ts` or a server function.

**`[fluixi/env] serverEnv("NAME") was called in a browser.`**
`serverEnv` is for server code only.

**`middleware called next() more than once`**
A middleware calls `next()` twice; call it once and return its result.

## Routing

**`[fluixi] a.tsx and b.tsx in src/routes answer the same address: only the first renders.`**
Two route files match the same URLs (`[a].tsx` and `[b].tsx` side by side). Rename one, or move it
into its own folder.

## Custom elements

**`[fluixi] <x-card> has children between its tags that its render() does not place, so they are not shown.`**
A light-DOM element must place its authored children itself: `this.authoredChildren` or
`this.slotted('name')` in `render()`. A `<slot>` works only with shadow DOM
([Web components](/v1/en/web-components)).

**`[fluixi] NAME is not a declared prop of <x-card>`**
The page sets a property the element does not declare. Add it to the element's props, or fix the
name.

## Hot reload

**`[fluixi] <file>: Name is not a component, so the page reloads.`**
A capitalised export that is not a function (a constant, a context) cannot be swapped; the page
reloads instead. Move it to its own file to keep the component file swappable
([Hot reload](/v1/en/hot-reload)).

## Still stuck

The devtools show the reactive graph and a timeline of what each write caused: which effect ran,
which nodes were created and disposed. That usually shows why something did not update, or
updated too often.
