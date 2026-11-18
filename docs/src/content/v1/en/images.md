# Images

`@fluixi/start` ships an image pipeline: a route that resizes and re-encodes on demand, and an
`Img` component that asks it for the size each image is drawn at.

```ts
// src/api/image.ts  →  /api/image
import { createImageHandler } from '@fluixi/start/image/server';

export const GET = createImageHandler({
  domains: ['images.example.com'],
});
```

```tsx
import { Img } from '@fluixi/start/image';

<Img src="/mug.jpg" alt="A mug" width={480} height={320} />;
```

`Img` renders one `<img>` with a `srcset`, and nothing else: no wrapper, no styles, no state.

| Prop | |
| --- | --- |
| `width`, `height` | the image's own size, so the browser reserves its space; the URLs are its 1x and 2x widths |
| `sizes` | how wide the image is drawn, for a layout that decides it; the `srcset` then lists every width |
| `priority` | an image above the fold: loaded at once and early, instead of lazily |
| `fill` | cover the positioned parent, with no size of its own; drawn at `100vw` unless `sizes` says otherwise |
| `quality` | passed to the endpoint, which caps it |
| `loader` | builds the URLs, by default for `/api/image`; any `({ src, width, quality }) => url`, a CDN's for instance |
| `unoptimized` | the plain `src`; SVG sources are always served this way |

Every other attribute goes to the `<img>`.

The handler reads `url`, `w` and optional `q` from the query string, and `imageLoader()` builds
that URL. For a styled image with a loading state, a placeholder and a fallback, use
`@fluixi-ui/image` with the same loader:

```tsx
import { imageLoader } from '@fluixi/start/image';
import { Image } from '@fluixi-ui/image';

<Image src="/mug.jpg" loader={imageLoader()} widths={[120, 240, 480]} aspectRatio={3 / 2} />;
```

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
thousands of variants and fill the cache. The default list, `IMAGE_WIDTHS`, covers common
device widths, and it is also the list `Img` builds its URLs from. If you set your own
`sizes`, give `Img` the same list as `widths`, or it asks for widths the handler refuses.

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
