// On-demand image optimization: a Web `Request` → `Response` handler that resizes
// and re-encodes images (to AVIF/WebP by content negotiation), plus a matching
// `imageLoader` for `@fluixi-ui/image`. The actual codec is pluggable — the
// default uses `sharp` if it's installed, otherwise it streams the source through
// unchanged (so the framework never hard-depends on a native module).
import { readFile } from 'node:fs/promises';
import { resolve as resolvePath, join, extname, sep } from 'node:path';

export interface ImageTransformArgs {
  /** Target width in px. */
  width: number;
  /** Quality 1–100. */
  quality: number;
  /** Negotiated output format (`original` = keep the source encoding). */
  format: 'avif' | 'webp' | 'jpeg' | 'png' | 'original';
  /** The source `content-type`. */
  contentType: string;
}

/** Resize / re-encode `input`; return `null` to pass the source through untouched. */
export type ImageTransform = (
  input: Uint8Array,
  args: ImageTransformArgs,
) => Promise<{ data: Uint8Array; contentType: string } | null>;

export interface ImageHandlerOptions {
  /** Root directory for local `/foo.jpg` sources. Default `<cwd>/public`. */
  root?: string;
  /** Allowed hostnames for absolute `https://…` sources (SSRF guard). */
  domains?: string[];
  /** Permitted target widths; a request outside the list is rejected. */
  sizes?: number[];
  /** Max quality (also the default when `q` is omitted). Default `80`. */
  quality?: number;
  /** `Cache-Control` max-age, seconds. Default one year (immutable). */
  cacheMaxAge?: number;
  /** Override the codec. Default: `sharp` if present, else passthrough. */
  transform?: ImageTransform;
  /** In-memory result cache; `false` disables, a number sets max entries (default `100`). */
  cache?: boolean | number;
}

const DEFAULT_SIZES = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};

let sharpModule: unknown;
async function loadSharp(): Promise<any> {
  if (sharpModule !== undefined) return sharpModule;
  try {
    // Variable specifier so bundlers/tsc treat `sharp` as an optional runtime dep.
    const name = 'sharp';
    sharpModule = (await import(/* @vite-ignore */ name)).default;
  } catch {
    sharpModule = null;
  }
  return sharpModule;
}

const defaultTransform: ImageTransform = async (input, { width, quality, format }) => {
  const sharp = await loadSharp();
  if (!sharp) return null; // no codec → passthrough
  const pipe = sharp(input).rotate().resize({ width, withoutEnlargement: true });
  if (format === 'avif') return { data: new Uint8Array(await pipe.avif({ quality }).toBuffer()), contentType: 'image/avif' };
  if (format === 'webp') return { data: new Uint8Array(await pipe.webp({ quality }).toBuffer()), contentType: 'image/webp' };
  if (format === 'png') return { data: new Uint8Array(await pipe.png().toBuffer()), contentType: 'image/png' };
  return { data: new Uint8Array(await pipe.jpeg({ quality, mozjpeg: true }).toBuffer()), contentType: 'image/jpeg' };
};

function imageResponse(body: Uint8Array, contentType: string, maxAge: number): Response {
  return new Response(body as BodyInit, {
    headers: {
      'content-type': contentType,
      'cache-control': `public, max-age=${maxAge}, immutable`,
      vary: 'Accept',
    },
  });
}

/**
 * Build a Web-standard image-optimization handler. Mount it as an API route and
 * point {@link imageLoader} at the same path:
 *
 * ```ts
 * // src/api/image.ts
 * import { createImageHandler } from '@fluixi/start';
 * export const GET = createImageHandler({ root: 'public', domains: ['cdn.example.com'] });
 * ```
 *
 * Install `sharp` to get real resizing + AVIF/WebP; without it, sources stream
 * through unchanged (so it's safe to ship either way).
 */
export function createImageHandler(options: ImageHandlerOptions = {}): (request: Request) => Promise<Response> {
  const root = resolvePath(options.root ?? join(process.cwd(), 'public'));
  const domains = new Set((options.domains ?? []).map((d) => d.toLowerCase()));
  const sizes = options.sizes ?? DEFAULT_SIZES;
  const maxQuality = options.quality ?? 80;
  const maxAge = options.cacheMaxAge ?? 60 * 60 * 24 * 365;
  const transform = options.transform ?? defaultTransform;
  const cacheMax = options.cache === false ? 0 : typeof options.cache === 'number' ? options.cache : 100;
  const cache = new Map<string, { body: Uint8Array; contentType: string }>();

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const src = url.searchParams.get('url') ?? url.searchParams.get('src');
    const width = Number(url.searchParams.get('w'));
    const quality = Math.min(Math.max(Number(url.searchParams.get('q')) || maxQuality, 1), 100);

    if (!src) return new Response('missing "url"', { status: 400 });
    if (!Number.isInteger(width) || !sizes.includes(width)) return new Response('invalid "w"', { status: 400 });

    const accept = request.headers.get('accept') ?? '';
    const format: ImageTransformArgs['format'] =
      accept.includes('image/avif') ? 'avif' : accept.includes('image/webp') ? 'webp' : 'original';

    const key = `${src}|${width}|${quality}|${format}`;
    const hit = cache.get(key);
    if (hit) return imageResponse(hit.body, hit.contentType, maxAge);

    let input: Uint8Array;
    let sourceType: string;
    if (/^https?:\/\//i.test(src)) {
      let host: string;
      try { host = new URL(src).hostname.toLowerCase(); } catch { return new Response('bad url', { status: 400 }); }
      if (!domains.has(host)) return new Response('domain not allowed', { status: 403 });
      const res = await fetch(src);
      if (!res.ok) return new Response('upstream error', { status: 502 });
      input = new Uint8Array(await res.arrayBuffer());
      sourceType = res.headers.get('content-type') ?? 'application/octet-stream';
    } else {
      const filePath = resolvePath(root, src.startsWith('/') ? src.slice(1) : src);
      if (filePath !== root && !filePath.startsWith(root + sep)) return new Response('forbidden', { status: 403 });
      try {
        input = new Uint8Array(await readFile(filePath));
      } catch {
        return new Response('not found', { status: 404 });
      }
      sourceType = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    }

    // Vector / animated sources aren't rasterized — stream them through.
    if (sourceType === 'image/svg+xml' || sourceType === 'image/gif') {
      return imageResponse(input, sourceType, maxAge);
    }

    let out: { data: Uint8Array; contentType: string } | null = null;
    try {
      out = await transform(input, { width, quality, format, contentType: sourceType });
    } catch {
      out = null;
    }
    const body = out?.data ?? input;
    const contentType = out?.contentType ?? sourceType;

    if (cacheMax > 0) {
      if (cache.size >= cacheMax) cache.delete(cache.keys().next().value as string);
      cache.set(key, { body, contentType });
    }
    return imageResponse(body, contentType, maxAge);
  };
}

export interface ImageLoaderOptions {
  /** Path the {@link createImageHandler} route is mounted at. Default `/api/image`. */
  path?: string;
}

/**
 * A loader for `@fluixi-ui/image` that targets a {@link createImageHandler} route.
 *
 * ```tsx
 * import { imageLoader } from '@fluixi/start';
 * const loader = imageLoader({ path: '/api/image' });
 * <Image src="/mug.jpg" loader={loader} widths={[120, 240, 480]} />
 * ```
 */
export function imageLoader(options: ImageLoaderOptions = {}): (args: { src: string; width: number; quality?: number }) => string {
  const path = options.path ?? '/api/image';
  return ({ src, width, quality }) => {
    const params = new URLSearchParams({ url: src, w: String(width) });
    if (quality != null) params.set('q', String(quality));
    return `${path}?${params.toString()}`;
  };
}
