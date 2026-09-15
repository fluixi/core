# Images

`@fluixi/start` ships an image pipeline: a route that resizes and re-encodes on demand,
and a loader that points image markup at it.

```ts
// src/api/image.ts  →  /api/image
import { createImageHandler } from '@fluixi/start';

export const GET = createImageHandler({
  domains: ['images.example.com'],
});
```

```tsx
import { imageLoader } from '@fluixi/start';

const loader = imageLoader();   // defaults to /api/image

<Image src="/mug.jpg" loader={loader} widths={[120, 240, 480]} />;
```

The handler reads `url`, `w` and optional `q` from the query string, so the loader's only
job is building that URL, which means anything that can produce a `srcset` can use it.

## Configuring the handler

```ts
export const GET = createImageHandler({
  root: './public',              // where local /foo.jpg sources are read from
  domains: ['images.example.com'],
  sizes: [320, 640, 1280],
  quality: 80,
  cacheMaxAge: 60 * 60 * 24 * 365,
  cache: 100,
});
```

Every option has a defensible default; two are worth setting deliberately.

**`domains` is an SSRF guard.** An image endpoint that fetches whatever URL it is given is
a way to make your server issue arbitrary requests, including to internal addresses a
browser could never reach. Absolute sources are only fetched from hostnames you list, so
leaving it unset means only local files are allowed. That is the safe default, and the
reason to widen it consciously.

**`sizes` bounds the work.** A request for a width outside the list is rejected rather than
resized, so a crawler walking `?w=1`, `?w=2`, `?w=3` cannot make your server encode
thousands of variants and fill the cache. The default list covers common device widths.

`quality` is both the default and the ceiling, a request asking for more than the
configured quality does not get it.

## Encoding

Transformation uses **`sharp` when it is installed**, and passes the original through
untouched when it is not. So the pipeline degrades to plain file serving rather than
failing, and adding `sharp` is what switches optimisation on:

```
pnpm add sharp
```

Supply your own `transform` to use a different codec.

## Caching

Responses are sent with a long-lived immutable `Cache-Control`, which is safe because the
URL encodes the transformation, a different width or quality is a different URL. In front
of that sits a small in-memory cache of recent results (100 entries by default), so a
repeated request does not re-encode. Set `cache: false` to disable it, or a number to size
it.

In production most requests should never reach the handler at all: a CDN in front of it
will serve the immutable responses itself.

Next: **[Deployment](/v1/en/deployment)**.
