import { createServer as createHttpServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { join, extname } from 'node:path';

/**
 * The runtime-neutral request layer. Everything renders through a Web
 * `Request → Response` handler, so the same core works in Node, Bun, Deno, and
 * edge/worker runtimes — only the *bridge* (Node http here) is platform-specific.
 * This is the seam deploy adapters plug into.
 */

/** Produce page HTML for a request URL (pathname + search). */
export type RenderFn = (url: string, request: Request) => string | Promise<string>;

/** Web-standard request handler. */
export type FetchHandler = (request: Request) => Promise<Response>;

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
    init.body = req as any; // Node readable — fine for undici/Node fetch
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

/**
 * Wrap a handler to serve static files from `dir` first (for filesystem runtimes —
 * Node/Bun/Deno). Edge runtimes serve assets via the platform, so they use the bare
 * handler instead.
 */
export function withStaticFiles(handler: FetchHandler, dir: string): FetchHandler {
  return async (request) => {
    const { pathname } = new URL(request.url);
    if (pathname !== '/' && extname(pathname)) {
      const file = join(dir, decodeURIComponent(pathname));
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
    }
    return handler(request);
  };
}
