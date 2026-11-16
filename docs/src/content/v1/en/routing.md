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
    login.tsx        →  /login   (the group is not in the URL)
```

Four conventions, and that is the whole file layer:

| File | Meaning |
| --- | --- |
| `index.tsx` | the directory's own path |
| `[id].tsx` | one dynamic segment, matched as `:id` |
| `[...slug].tsx` | catch-all, matches the rest of the path |
| `layout.tsx` | wraps the routes beside and below it |
| `(name)/` | **grouping only**, organises files without adding a URL segment |

A route group `(auth)` is flattened: `(auth)/login.tsx` serves `/login`, not `/auth/login`.
It exists so a set of routes can share a folder, and, if you add one, a `layout.tsx`,
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

A layout stays mounted while you navigate between the routes inside it, so state it holds,
a scroll position, an open panel, a fetched list, survives the transition. That is the
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

### Links you didn't write

`<Link>` covers the links you author as JSX. It can't cover the ones that arrive as
markup, rendered markdown, a CMS payload, anything inserted through `innerHTML`. Those
are plain anchors with nothing to bind to, so each one reloads the document.
`useLinkNavigation` returns a single delegated handler for the container they live in:

```tsx
import { useLinkNavigation } from '@fluixi/start/router';

const onClick = useLinkNavigation();

<article onClick={onClick} innerHTML={doc.html} />
```

The anchors stay anchors. Middle-click, open-in-new-tab, "copy link address" and crawlers
all keep working, because the elements are untouched and only a plain left-click is taken
over. Relative hrefs resolve against the current document, so a `./guide` written in
markdown lands on the right path.

These are left to the browser, deliberately:

| | |
|---|---|
| Modified clicks, any button but the primary one | That's how a user asks for a new tab |
| An event another handler already prevented | Something upstream decided |
| `target`, `download`, `rel="external"` | The markup already said what it wants |
| `mailto:`, `tel:`, any non-http scheme | Belongs to the OS |
| A different origin | Not ours to route |
| A hash pointing inside the current page | That's the browser's scroll; intercepting it breaks in-page anchors |

`shouldNavigate` opts out a section that has to load as a document, a different bundle, a
server-rendered admin area:

```tsx
const onClick = useLinkNavigation({
  shouldNavigate: (url) => !url.pathname.startsWith('/admin'),
});
```

It also takes `replace`, like `<Link>`.

### Location and query string

`useLocation()` returns a live object: read properties directly, no call:

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

The router keeps the current page on screen until the next route's data has arrived, then
swaps: no blank page and no loading flash between two routes. A layout's data loads once and
stays while you move between its children.

### Progress

`useIsRouting` is true from the moment a navigation starts until the route it lands on has its
modules and its data. `delay` holds the `true` back, so a quick navigation shows nothing:

```tsx
const routing = useIsRouting({ delay: 120 });

<div class="progress" data-active={() => (routing() ? '' : undefined)} />
```

Put one progress bar in the root layout; every navigation and every data load reports to it.

### Failures

A route whose data fails throws where the page reads it, so the nearest `ErrorBoundary` shows
the failure instead of an empty page:

```tsx
<ErrorBoundary fallback={(error, reset) => <Failed error={error} onRetry={reset} />}>
  <Outlet />
</ErrorBoundary>
```

The boundary also catches errors thrown later, from an effect long after the page was built.
`reset` renders the children again.

With no boundary of yours above a route, the router puts its own there. The route that failed
is replaced by a short error view, the layouts around it stay, and the error is logged. The view
shows nothing of the error itself, which can name files or hosts. Pass `error` to the Router for
your own:

```tsx
<Router routes={routes} error={(error, reset) => <Failed error={error} onRetry={reset} />} />
```

Navigating to another page clears the error, from your boundary or the router's. When the server
renders a page that failed, the response is a 500, or the error's own `status` when it has one
from 400 to 599. Data that found nothing can say so:

```ts
export const routeData = async ({ params }) => {
  const order = await findOrder(params.id);
  if (!order) throw Object.assign(new Error('order not found'), { status: 404 });
  return order;
};
```

The response is then a 404 and the built-in view is the one shown for an unknown address. The
`error` option receives the error, status included, to tell the cases apart.

### Caching and dependencies

`cache` keeps a function's results by name and arguments, shares one request between readers,
and `revalidate('user')` drops them and reloads the routes on screen. A route can also declare
app-wide values its data depends on with `routeDeps`. Both are covered in
[Caching data](/v1/en/caching).

For data not tied to a route, `createAsync` wraps a fetcher into a resource:

```tsx
import { createAsync, cache } from '@fluixi/start/router';

const getUser = cache((id: string) => fetchUser(id), 'user');

const user = createAsync(() => getUser(props.id));
```

## Mutations

`action` wraps a mutation so its progress is observable:

```tsx
import { action, useSubmission, ActionForm } from '@fluixi/start/router';

const save = action(async (fields: { name: string }) => {
  await updateProfile(fields);
}, 'save-profile', { invalidates: ['profile'] });

function Profile() {
  const submission = useSubmission(save);

  return (
    <ActionForm action={save}>
      <input name="name" />
      <button disabled={!!submission()?.pending}>Save</button>
    </ActionForm>
  );
}
```

Use `<ActionForm>`, not a plain `<form action={save}>`: the action is a function, and an
`action` attribute has to be a URL. `<ActionForm>` collects the fields into an object, calls the
action without a page navigation, and still emits `method="post"` with the action's real URL in
the markup, so a submit works before JavaScript loads.

`<ActionForm>` sends the fields as they are. When they need checking first (required, an email,
a length), use `Form` from `@fluixi-ui/form` with a `@fluixi/forms` form and the same action:
it validates, shows each error under its field, and calls the action with the checked values
only. It keeps `method="post"` and the action's URL in the markup too.

```tsx
import { createField, createForm, standardValidator } from '@fluixi/forms';
import { Form, FormField } from '@fluixi-ui/form';

const form = createForm({ name: createField('', { validators: [standardValidator(nameSchema)] }) });

<Form form={form} action={save} novalidate>
  <FormField control={form.get('name')} label="Name" />
  <button type="submit">Save</button>
</Form>
```

Name every action: the name is how its submissions are tracked, and two unnamed actions would
share them. `invalidates` lists the cached data a success changes, so the pages showing it
reload.

`useSubmission` reports the latest call, pending, result, error, along with `retry` and
`clear`, which is what a form needs to disable its button and show a failure without tracking
that by hand.

### Optimistic updates

`useSubmissions` lists every call still in flight, and those that failed, one entry per call,
so concurrent calls do not overwrite each other. Render the server's rows, then the pending
calls in the same shape:

```tsx
const moves = useSubmissions(moveDeal);

const rows = $memo(() => [
  ...deals(),
  ...moves().filter((s) => s.pending).map((s) => ({ ...s.input, pending: true })),
]);
```

A call that succeeds leaves the list and the server's row takes its place. One that fails stops
being pending, so it leaves the optimistic rows by itself, and stays in the list with its
`error` until `retry()` or `clear()`.

Next: **[Server functions](/v1/en/server-functions)**.
