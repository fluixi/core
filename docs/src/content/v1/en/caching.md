# Caching data

Data that does not change on every visit should not be fetched on every visit. Fluixi keeps
fetched results by name, shares one request between readers, and refreshes what a change
made stale, including in the other tabs of your site.

```ts
import { cache } from '@fluixi/start/router';

const organisations = cache(() => api.get('/api/v1/organizations'), 'orgs', { ttl: 30_000 });

export const routeData = () => organisations();
```

Coming back to this route within 30 seconds shows the list without a request. After that the
old list shows at once and a fresh one is fetched behind it.

## Where entries live

On the server, each request has its own cache: two visitors never read each other's
entries, and nothing outlives the request. In the browser, entries live for the page.
Readers of the same key share one request in flight, on both sides.

## cache

`cache(fn, name, options)` returns a function with the same arguments as `fn`. The key is the
name and the arguments, so `user('a')` and `user('b')` are two entries.

| Option | Default | |
| --- | --- | --- |
| `ttl` | until revalidated | milliseconds a value stays fresh |
| `staleWhileRevalidate` | `true` | once stale, return the old value at once and refresh behind it; the routes on screen load again when the new one lands |
| `cache` | the request or the page | where entries live (`ResourceCache`) |

Do not cache `routeData` itself: the router calls it with arguments that change on every
navigation. Cache a named function and call it from `routeData`, passing what the data
depends on.

## Revalidating

After a change, drop what it made stale:

```ts
import { action, revalidate } from '@fluixi/start/router';

const createOrg = action(createOrganization, 'org.create', { invalidates: ['orgs'] });

// or by hand
revalidate('orgs');                 // every orgs:* entry
revalidate(['orgs', 'members']);
revalidate((key) => key.startsWith('user:'));
```

The matching entries are dropped and the routes on screen load their data again. Entries
still cached are served from the cache, so only what was dropped is fetched. The page stays
on screen with its current data until the new data arrives.

`invalidates` can also be a function of the action's result:
`{ invalidates: (org) => ['orgs', `org:${org.id}`] }`.

A revalidation by name reaches the other open tabs of your site too, which drop the same
entries and reload their routes: creating an organisation in one tab updates the list in
another.

Inside a route's own data load, or anything that is already reloading, drop entries without
a reload: `clearCachedResources('orgs')` from `@fluixi/reactive/cached-resource`. On sign-in,
clear everything with `clearCachedResources()`, so nothing fetched for the previous user is
served to the next.

## When the server knows

Sometimes only the server knows what a request changed: accepting an invitation adds an
organisation to the list without the page calling the organisations endpoint. Declare it on
the API route:

```ts
import { route } from '@fluixi/api';
import { signedIn } from '@fluixi/auth/server';

export const POST = route({
  guard: signedIn(),
  body: acceptInvite,
  revalidates: ['orgs', 'members'],
  handler: ({ body, auth }) => invitations.accept(body.token, auth.user.id),
});
```

A successful response carries `x-fx-revalidate: orgs, members`, and a refused one carries
nothing. `@fluixi/api/client` reads it after each call and, in the browser, revalidates those
names. Pass `onRevalidate` to `createClient` to handle them yourself, or `false` to ignore the
header.

## Values the data depends on

Route data loads before the page's component exists, so it cannot depend on component state.
What a route loads should come from the URL (params, search), which reaches `routeData` and
keys the cache.

For app-wide values that are not in the URL, such as the signed-in user or the active
organisation, export `routeDeps` beside `routeData`:

```ts
export const routeDeps = () => [session.userId(), workspace.id()];

export const routeData = ({ deps }) => projects(...deps);
```

The values reach `routeData` as `args.deps`, so the cache keeps one entry per combination.
When they change, the route loads its data again, keeping the page on screen meanwhile.

## In a component

`cachedResource` is a resource whose results are kept the same way:

```ts
import { cachedResource } from '@fluixi/reactive/cached-resource';

const workspace = cachedResource(workspaceId, (id) => api.get(`/workspaces/${id}`), {
  name: 'workspace',
  ttl: 5 * 60_000,
  deps: [userId],
});

workspace();            // the value; suspends under <Suspense> on the first load
workspace.latest;       // the last value, without suspending
workspace.stale;        // true while a background refresh runs
workspace.refetch();
workspace.invalidate(); // drop the entry and fetch again
```

`deps` are accessors whose values join the key: each user gets their own entry, and
switching back to one is served from it. The fetcher still receives only the source's key.

A value fetched during the server render travels to the browser with the page, like a plain
resource's, and the first read there takes it instead of fetching again. In a start app,
`$cachedResource` needs no import.

## Keeping the cache across reloads

`storageCache(storage)` keeps entries in a [storage](/v1/en/storage) instead of memory:

```ts
import { storageCache, useStorage } from '@fluixi/core/storage';

const cache = storageCache(useStorage({ scope: 'session', namespace: 'cache' }), { ttl: 10 * 60_000 });
const orgs = cachedResource(() => api.get('/orgs'), { name: 'orgs', ttl: 60_000, cache });
```

Values pass through the storage's serializer, so they must be plain data. Give it its own
namespace and a `ttl`, so entries do not pile up after the code that wrote them is gone, and
clear it on sign-out, since it now outlives the page.
