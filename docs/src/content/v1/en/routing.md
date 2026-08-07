# Routing

`@fluixi/start` gives you **file-based routing**: files in `src/routes/` become routes.

```
src/routes/
  index.tsx          →  /
  about.tsx          →  /about
  users/
    layout.tsx       →  wraps everything under /users
    index.tsx        →  /users
    [id].tsx         →  /users/:id
  blog/
    [...slug].tsx    →  /blog/* (catch-all)
  (auth)/
    login.tsx        →  /login   — the group is not in the URL
```

Four conventions, and that is the whole file layer:

| File | Meaning |
| --- | --- |
| `index.tsx` | the directory's own path |
| `[id].tsx` | one dynamic segment, matched as `:id` |
| `[...slug].tsx` | catch-all — matches the rest of the path |
| `layout.tsx` | wraps the routes beside and below it |
| `(name)/` | **grouping only** — organises files without adding a URL segment |

A route group `(auth)` is flattened: `(auth)/login.tsx` serves `/login`, not `/auth/login`.
It exists so a set of routes can share a folder — and, if you add one, a `layout.tsx` —
without that folder appearing in the URL.

## Dynamic segments and params

`[param]` captures a segment. `useParams` returns an **accessor**, because navigating
between two matches of the same route changes the params without unmounting the component:

```tsx
import { useParams } from '@fluixi/start/router';

export default function Post() {
  const params = useParams<{ slug: string }>();
  return <h1>{params().slug}</h1>;
}
```

Related hooks, for narrower needs:

```tsx
const id = useParam('id');                  // one param, as an accessor
const own = useLevelParams();               // only the params this layer introduced
const matched = useMatch(() => '/users/:id'); // is this pattern currently matched?
```

## Nested layouts

A `layout.tsx` wraps its child routes around an `<Outlet/>`:

```tsx
import { Outlet } from '@fluixi/start/router';

export default function UsersLayout() {
  return (
    <div class="users">
      <Sidebar />
      <Outlet />
    </div>
  );
}
```

A layout stays mounted while you navigate between the routes inside it, so state it holds
— a scroll position, an open panel, a fetched list — survives the transition. That is the
main reason to reach for one.

## Navigation

`<Link>` navigates on the client; a plain `<a href>` does a full page load.

```tsx
import { Link } from '@fluixi/start/router';

<Link href="/about">About</Link>
<Link href="/users/42" replace>Replace history entry</Link>
<Link href="/docs" activeClass="on">Docs</Link>
```

`activeClass` is applied while the link matches the current path, so a nav highlight needs
no extra wiring. `active` overrides that decision when you need something other than an
exact path match. `A` is an alias for `Link`.

For programmatic navigation:

```tsx
import { useNavigate } from '@fluixi/start/router';

const navigate = useNavigate();
navigate('/dashboard');
navigate('/login', { replace: true });
```

### Location and query string

`useLocation()` returns a live object — read properties directly, no call:

```tsx
const location = useLocation();
location.pathname;   // reactive
```

`useSearchParams` is a getter/setter pair. Setting a key to `null` removes it:

```tsx
const [params, setParams] = useSearchParams();

params().page;                        // "2"
setParams({ page: '3' });             // ?page=3
setParams({ page: null });            // removes it
setParams({ page: '1' }, { replace: true });
```

## Loading data

A route file can export `routeData`, and the nearest one is available through
`useRouteData`:

```tsx
export function routeData({ params }) {
  return getUser(params().id);   // params is an accessor, not a plain object
}

export default function User() {
  const user = useRouteData<User>();
  return <h1>{user()?.name}</h1>;
}
```

`useRouteData` returns an accessor that suspends under `<Suspense>` while loading, so a
boundary above it shows the fallback rather than a flash of empty state.

For data not tied to a route, `createAsync` wraps a fetcher into a resource:

```tsx
import { createAsync, cache } from '@fluixi/start/router';

const getUser = cache((id: string) => fetchUser(id), 'user');

const user = createAsync(() => getUser(props.id));
```

`cache` gives the function a stable key so identical calls deduplicate, results transfer
from server to client during hydration instead of being fetched twice, and
`revalidate('user')` can invalidate them.

## Mutations

`action` wraps a mutation so its progress is observable:

```tsx
import { action, useSubmission, Form } from '@fluixi/start/router';

const save = action(async (data: FormData) => {
  await updateProfile(data);
}, 'save-profile');

function Profile() {
  const submission = useSubmission(save);

  return (
    <Form action={save}>
      <input name="name" />
      <button disabled={!!submission()?.pending}>Save</button>
    </Form>
  );
}
```

Use `<Form>`, not a plain `<form action={save}>` — the action is a function, and an `action`
attribute has to be a URL. `<Form>` builds the `FormData`, calls the action without a page
navigation, and still emits `method="post"` with the action's real URL in the markup, so a
submit works before JavaScript loads.

`useSubmission` reports the in-flight state — pending, result, error — along with `retry`
and `clear`, which is what a form needs to disable its button and show a failure without
tracking that by hand.

Next: **[Server functions](/v1/en/server-functions)**.
