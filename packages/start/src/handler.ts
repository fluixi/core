import { createServer as createHttpServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { extname, resolve, sep } from 'node:path';
import { liftHead } from './document.js';
import { withPlatformRequest } from './platform-request.js';
import { setClientAddress } from './client-address.js';
import { takeResponseHeaders } from '@fluixi/dom';

/**
 * The runtime-neutral request layer. Everything renders through a Web
 * `Request → Response` handler, so the same core works in Node, Bun, Deno, and
 * edge/worker runtimes: only the *bridge* (Node http here) is platform-specific.
 * This is the seam deploy adapters plug into.
 */

/** Produce page HTML for a request URL (pathname + search). */
export type RenderFn = (url: string, request: Request) => string | Promise<string>;

/** Web-standard request handler. */
export type FetchHandler = (request: Request) => Promise<Response>;

/** Produce a web `ReadableStream` of the app body (no document shell) for a URL. */
export type StreamRenderFn = (
  url: string,
  request: Request,
) => ReadableStream<Uint8Array> | Promise<ReadableStream<Uint8Array>>;

/**
 * Compose a streamed HTML Response: `head` once the body's head marker is known, then the app
 * `body` stream into the mount point, then `tail` (client script + closing tags).
 *
 * Resolves only when the head can go out. Nothing is flushed before that anyway, so waiting
 * costs nothing, and it leaves the response headers open until then: a cookie set while the
 * shell rendered still reaches them. A body that fails before that rejects, which the caller
 * turns into a real 500; a failure after it can only cut the stream short.
 */
export async function streamDocument(
  head: string,
  body: ReadableStream<Uint8Array>,
  tail: string,
): Promise<Response> {
  const enc = new TextEncoder();
  // The head waits for the body's opening marker: once flushed it cannot change, and
  // the marker is where seo() puts the page's title and meta. Sent early, every
  // streamed page went out with the template's title, which is what a crawler reads.
  const reader = body.getReader();
  const { marker, rest } = await readHeadMarker(reader);
  const lifted = marker ? liftHead(head, marker).html : head;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(enc.encode(lifted));
        if (rest?.length) controller.enqueue(rest);
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.enqueue(enc.encode(tail));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

const MARKER_OPEN = new TextEncoder().encode('<!--fh:');
const MARKER_CLOSE = new TextEncoder().encode('-->');

function indexOf(haystack: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/**
 * Read just enough of the body to know whether it opens with a head marker, and all of it
 * when it does. Works on bytes: the marker is ASCII, and decoding the body to find it could
 * split a multibyte character across two chunks.
 */
async function readHeadMarker(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<{ marker: string | null; rest: Uint8Array | null }> {
  let buf = new Uint8Array(0);
  for (;;) {
    const opens = buf.length >= MARKER_OPEN.length && indexOf(buf.subarray(0, MARKER_OPEN.length), MARKER_OPEN) === 0;
    if (buf.length >= MARKER_OPEN.length && !opens) return { marker: null, rest: buf };
    if (opens) {
      const close = indexOf(buf, MARKER_CLOSE, MARKER_OPEN.length);
      if (close >= 0) {
        const end = close + MARKER_CLOSE.length;
        return { marker: new TextDecoder().decode(buf.subarray(0, end)), rest: buf.subarray(end) };
      }
    }
    const { done, value } = await reader.read();
    if (done) return { marker: null, rest: buf };
    const next = new Uint8Array(buf.length + value.length);
    next.set(buf);
    next.set(value, buf.length);
    buf = next;
  }
}

/**
 * Merges the headers code wrote with `appendResponseHeader` while answering `request` (a
 * cookie set during the render) into `response`. `Set-Cookie` appends; any other header the
 * response already has is left alone.
 */
export function withResponseHeaders(request: Request, response: Response): Response {
  const extra = takeResponseHeaders(request);
  if (!extra) return response;
  let empty = true;
  extra.forEach(() => (empty = false));
  if (empty) return response;
  const merge = (headers: Headers) => {
    for (const cookie of extra.getSetCookie()) headers.append('set-cookie', cookie);
    extra.forEach((value, name) => {
      if (name !== 'set-cookie' && !headers.has(name)) headers.set(name, value);
    });
  };
  try {
    merge(response.headers);
    return response;
  } catch {
    // A fetched or redirect Response has immutable headers: copy it.
    const headers = new Headers(response.headers);
    merge(headers);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
}

/** Wrap a render function as a fetch handler (Node/Bun/Deno/edge-portable). */
export function createRequestHandler(render: RenderFn): FetchHandler {
  return async (request) => {
    const url = new URL(request.url);
    try {
      const html = await withPlatformRequest(request, () => render(url.pathname + url.search, request));
      return new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    } catch (e: any) {
      return new Response(String(e?.stack || e), {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
  };
}

// ─── Node bridge (the built-in "node adapter") ──────────────────────────────

export interface NodeRequestOptions {
  /** Reverse proxies whose forwarded headers are believed; see `FluixiConfig.trustProxy`. */
  trustProxy?: number | boolean;
}

/** Build a Web `Request` from a Node `IncomingMessage`. */
export function nodeToRequest(req: IncomingMessage, options: NodeRequestOptions = {}): Request {
  const hops = options.trustProxy === true ? Infinity : Number(options.trustProxy || 0);
  const forwarded = (name: string) => {
    const value = req.headers[name];
    return hops > 0 && typeof value === 'string' ? value.split(',')[0]!.trim() || undefined : undefined;
  };
  const host = forwarded('x-forwarded-host') ?? req.headers.host ?? 'localhost';
  const proto = forwarded('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const url = `${proto}://${host}${req.url ?? '/'}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v != null) headers.set(k, v);
  }
  const method = req.method ?? 'GET';
  const init: RequestInit = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = req as any; // Node readable: fine for undici/Node fetch
    (init as any).duplex = 'half';
  }
  return setClientAddress(new Request(url, init), addressOf(req, hops));
}

/**
 * Each proxy appends the peer it saw to `x-forwarded-for`, so reading from the right, the
 * socket's peer and then one entry per trusted proxy; what lies further left is the client's
 * to write, and not believed.
 */
function addressOf(req: IncomingMessage, hops: number): string | undefined {
  const peer = req.socket?.remoteAddress;
  if (hops <= 0) return peer;
  const header = req.headers['x-forwarded-for'];
  const listed = (Array.isArray(header) ? header.join(',') : (header ?? ''))
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const chain = peer ? [...listed, peer] : listed;
  return chain[Math.max(0, chain.length - 1 - hops)];
}

/** Write a Web `Response` (string or streamed body) to a Node `ServerResponse`. */
export async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  // `forEach` yields each set-cookie on its own, and `setHeader` would keep only the last.
  response.headers.forEach((value, key) => {
    if (key !== 'set-cookie') res.setHeader(key, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader('set-cookie', cookies);
  const body = response.body;
  if (!body) {
    res.end(await response.text().catch(() => ''));
    return;
  }
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    res.end();
  }
}

/** Adapt a `FetchHandler` to a Node `(req, res)` handler. */
export function toNodeHandler(handler: FetchHandler, options: NodeRequestOptions = {}) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const response = await handler(nodeToRequest(req, options));
    await sendResponse(res, response);
  };
}

export interface ServeNodeOptions extends NodeRequestOptions {
  port?: number;
  onListen?: (port: number) => void;
  /** A failure to listen. Default: say why and exit non-zero. */
  onListenError?: (error: NodeJS.ErrnoException) => void;
}

/**
 * Make a failure to listen fatal and say why.
 *
 * Left alone, the error reaches the crash guard's `uncaughtException` handler, which only
 * logs it, so the process stays alive with nothing listening: a port that looks served
 * and is not, or is served by something else entirely.
 */
export function exitOnListenError(server: Server, port: number): void {
  server.once('error', (error: NodeJS.ErrnoException) => {
    const reason =
      error.code === 'EADDRINUSE'
        ? `port ${port} is already in use. Stop whatever holds it (lsof -i :${port}) or set another port.`
        : error.code === 'EACCES'
          ? `no permission to listen on port ${port}.`
          : `could not listen on port ${port}: ${error.message}`;
    console.error(`  fluixi: ${reason}`);
    process.exit(1);
  });
}

/** The reference **Node adapter**: serve a `FetchHandler` over `node:http`. */
export function serveNode(handler: FetchHandler, opts: ServeNodeOptions = {}): Server {
  const port = opts.port ?? 3000;
  const node = toNodeHandler(handler, { trustProxy: opts.trustProxy });
  const server = createHttpServer((req, res) => {
    node(req, res).catch((e) => {
      res.statusCode = 500;
      res.end(String((e as any)?.stack || e));
    });
  });
  if (opts.onListenError) server.once('error', opts.onListenError);
  else exitOnListenError(server, port);
  server.listen(port, () =>
    opts.onListen ? opts.onListen(port) : console.log(`  fluixi → http://localhost:${port}`),
  );
  return server;
}

const MIME: Record<string, string> = {
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.map': 'application/json',
};

export interface StaticFilesOptions {
  /**
   * The directory the build writes hashed bundles to, relative to `dir`.
   *
   * A miss inside it is answered with a 404 rather than passed to the renderer, because no
   * route can live there. Vite's default, and the reason for the option is apps that
   * override `build.assetsDir`.
   */
  assetDir?: string;
}

/**
 * Wrap a handler to serve static files from `dir` first (for filesystem runtimes,
 * Node/Bun/Deno). Edge runtimes serve assets via the platform, so they use the bare
 * handler instead.
 *
 * Two things here are load bearing.
 *
 * Every candidate path is resolved and checked to be inside `dir`. A URL's pathname keeps
 * percent-encoded separators (`new URL` decodes neither `%2e` nor `%2f`), so decoding one
 * can reintroduce `../` after the URL parser has already had its say, and a plain join then
 * points outside the served directory. Containment is checked on the resolved path rather
 * than by pattern matching the request, which is the only form that holds for encodings not
 * thought of here.
 *
 * A miss under the asset directory is a 404. Falling through means the renderer answers a
 * request for a bundle with a document, and a browser reports the MIME type rather than the
 * missing file, which hides the usual cause: a document naming a hash that is no longer on
 * disk, after a rebuild under a running server.
 */
export function withStaticFiles(
  handler: FetchHandler,
  dir: string,
  options: StaticFilesOptions = {},
): FetchHandler {
  const root = resolve(dir);
  const assetPrefix = `/${(options.assetDir ?? 'assets').replace(/^\/+|\/+$/g, '')}/`;

  /** The file this request names, or null when it names something outside `dir`. */
  const resolveWithin = (pathname: string): string | null => {
    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      // Malformed encoding. Nothing legitimate produces it.
      return null;
    }
    const file = resolve(root, `.${decoded.startsWith('/') ? decoded : `/${decoded}`}`);
    return file === root || file.startsWith(root + sep) ? file : null;
  };

  const missingAsset = (pathname: string) =>
    new Response(
      `Not found: ${pathname}\n\n` +
        'Nothing here matches, and this path is build output, so no route can answer it. ' +
        'A document is naming a bundle that is not on disk. The usual cause is a rebuild ' +
        'while the server was running, or a cached document from an earlier build: rebuild, ' +
        'restart, then reload without cache.\n',
      { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );

  return async (request) => {
    const { pathname } = new URL(request.url);
    if (pathname !== '/' && extname(pathname)) {
      const file = resolveWithin(pathname);
      if (file === null) {
        // 404 rather than 403: a refusal that distinguishes "outside" from "absent" tells a
        // caller which guesses are landing.
        return new Response('Not found\n', {
          status: 404,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      }
      try {
        const s = await stat(file);
        if (s.isFile()) {
          const body = Readable.toWeb(createReadStream(file)) as unknown as ReadableStream;
          return new Response(body, {
            headers: {
              'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
              'content-length': String(s.size),
            },
          });
        }
      } catch { /* not a static file → fall through to SSR */ }
      if (pathname.startsWith(assetPrefix)) return missingAsset(pathname);
    }
    return handler(request);
  };
}
