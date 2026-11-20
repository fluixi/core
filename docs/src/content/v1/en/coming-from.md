# Coming from React, Solid or Next.js

What carries over, what changes, and the habits to drop. Each section maps what you know to its
Fluixi equivalent and links to the page that explains it.

## From React

The biggest change: **a component runs once.** There is no re-render. State is held in signals, and
a change updates only the text, attribute or branch that reads it. Most React habits come from
re-rendering, and most of them can go.

| React | Fluixi |
|---|---|
| `const [n, setN] = useState(0)` | `const n = $signal(0)`, read `n()`, write `n.set(1)` |
| `useMemo(() => a * b, [a, b])` | `$memo(() => a() * b())`: no dependency array, reads are tracked |
| `useEffect(() => {...}, [dep])` | `$effect(() => {...})`; `onMount` for code that runs once in the browser |
| effect cleanup `return () => ...` | `onCleanup(() => ...)`, or the function `onMount` returns |
| `useRef` | `let el!: HTMLElement` and `ref={el}`; a plain variable for anything else |
| `useCallback` | a plain function: the component does not run again, so nothing is recreated |
| `React.memo` | nothing: there are no re-renders to skip |
| `{cond && <X />}` | `<Show when={cond()}><X /></Show>` |
| `list.map(x => <li key={x.id}>)` | `<For each={list()} by={(x) => x.id}>` |
| `useContext` / `createContext` | the same names, from `@fluixi/core` ([Context](/v1/en/context)) |
| `useReducer`, nested state | `$store` with path setters ([Stores](/v1/en/stores)) |
| `<Suspense>`, `lazy` | the same, plus `load:visible` and friends on any tag ([Loading strategies](/v1/en/load-strategies)) |
| `className` | `class`, and `classList={{ active: on() }}` |
| `useId` | `createUniqueId()` |

Habits to drop:

- **Dependency arrays.** A memo or an effect tracks what it reads, each time it runs. There is
  nothing to keep in sync, and no stale closure.
- **Destructuring props at the top and expecting it to stay current.** The compiler keeps it live in
  the plain cases; a nested destructure reads once and the build warns
  ([Components](/v1/en/components)).
- **Early returns.** `if (!user) return <Login />` is decided once; use `<Show>`.
- **Setting state in an effect to derive it.** Use a memo.
- **Worrying about render cost.** Splitting a component does not change what updates.

## From Solid

Fluixi is close to Solid: fine-grained signals, components that run once, the same control-flow
components. What differs:

| Solid | Fluixi |
|---|---|
| `const [n, setN] = createSignal(0)` | `const n = signal(0)` (or `$signal` in an app): one handle, `n()` and `n.set()`. `createSignal` still exists, returning the tuple |
| `createMemo`, `createEffect`, `createResource` | `memo`, `effect`, `resource`, and their `$` forms with no import |
| `createStore` returns `[state, setState]` | `$store(...)` returns one handle: read `cart.lines`, write `cart.set('lines', ...)` |
| `<For each={list()}>` | the same; add `by={(x) => x.id}` to keep rows for recreated objects |
| `mergeProps`, `splitProps`, `children()` | `mergeProps`, `splitProps`, `readChildren()` |
| `splitProps` to keep props live when destructuring | write `function C({ title })`: the compiler rewrites it to `props.title` |
| `createEffect` skipped on the server | **an effect runs on the server too**; use `onMount` for browser-only work ([Effects](/v1/en/effects)) |

Also new: dependency injection with `inject()` and app modules ([Dependency injection](/v1/en/dependency-injection)),
custom elements as first-class components ([Web components](/v1/en/web-components)), and `load:`
strategies on any tag.

## From Next.js

`@fluixi/start` covers what Next.js does for an app (file routes, server rendering, server code,
middleware, static output), with a different model for data: there are no server components. Every
route component renders on the server and hydrates in the browser; data comes in through
`routeData`.

| Next.js | Fluixi start |
|---|---|
| `app/blog/[slug]/page.tsx` | `src/routes/blog/[slug].tsx` ([Routing](/v1/en/routing)) |
| `layout.tsx` | a layout route rendering `<Outlet />` |
| `async` server component fetching data | `export const routeData = ...` in the route file, read with `useRouteData()` |
| `fetch(..., { next: { revalidate } })` | `cache(fn, 'name')` and `revalidate('name')` ([Caching](/v1/en/caching)) |
| Server Actions | `'use server'` functions and `action(fn, 'name')` ([Server functions](/v1/en/server-functions)) |
| `app/api/.../route.ts` | API routes ([API routes](/v1/en/api-routes)) |
| `middleware.ts` | middleware ([Middleware](/v1/en/middleware)) |
| `metadata` / `generateMetadata` | `seo()` ([SEO](/v1/en/seo)) |
| `next/link`, `useRouter().push` | `<Link href>`, `useNavigate()` |
| `useParams`, `useSearchParams` | the same names, from `@fluixi/start/router` |
| `generateStaticParams`, static export | [Static generation](/v1/en/static-generation) |
| `NEXT_PUBLIC_*` | names listed in `env.public` ([Environment](/v1/en/environment)) |
| `'use client'` | not needed: every component runs in the browser; mark server-only files `*.server.ts` |
| `next/image` | [Images](/v1/en/images) |

To keep code off the client, there is no `'use client'` boundary to manage. Server-only code goes
in `*.server.ts` files, `'use server'` functions, API routes and middleware, and the build refuses
an import of a server file from browser code. To ship less JavaScript for a part of the page, defer
it with `load:visible`, `load:idle` or `load:never`.

Next: **[Troubleshooting](/v1/en/troubleshooting)**.
