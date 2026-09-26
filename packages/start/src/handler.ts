import { createServer as createHttpServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { extname, resolve, sep } from 'node:path';

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
 * Compose a streamed HTML Response: flush `head` immediately (browser starts fetching
 * assets while the server awaits data), then pipe the app `body` stream into the mount
 * point, then `tail` (client script + closing tags). A render error after the head is
 * flushed can only error the stream (status is already 200), truncated HTML; callers
 * should guard the pre-flush path for a real 500.
 */
export function streamDocument(
  head: string,
  body: ReadableStream<Uint8Array>,
  tail: string,
): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(enc.encode(head));
        const reader = body.getReader();
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

/** Wrap a render function as a fetch handler (Node/Bun/Deno/edge-portable). */
export function createRequestHandler(render: RenderFn): FetchHandler {
  return async (request) => {
    const url = new URL(request.url);
    try {
      const html = await render(url.pathname + url.search, request);
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

/** Build a Web `Request` from a Node `IncomingMessage`. */
export function nodeToRequest(req: IncomingMessage): Request {
  const host = req.headers.host ?? 'localhost';
  const url = `http://${host}${req.url ?? '/'}`;
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
  return new Request(url, init);
}

/** Write a Web `Response` (string or streamed body) to a Node `ServerResponse`. */
export async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
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
export function toNodeHandler(handler: FetchHandler) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const response = await handler(nodeToRequest(req));
    await sendResponse(res, response);
  };
}

export interface ServeNodeOptions {
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
  const node = toNodeHandler(handler);
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
