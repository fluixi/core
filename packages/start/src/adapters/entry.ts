/**
 * The source of the entry a deploy adapter bundles.
 *
 * Every one of these platforms runs the same handler; they differ only in what they
 * expect the module to export and how static assets reach the request. So the entry
 * is generated rather than shipped: it imports the built server and the template,
 * hands both to `createHandlerFrom`, and wraps the result in whatever shape the
 * platform invokes.
 *
 * The template is inlined as a string. Reading `index.html` at runtime is what
 * `createProdHandler` does on Node and what none of these can do.
 */

export interface EntrySource {
  /** Path to the built server entry, relative to the generated file. */
  serverEntry: string;
  /** Path to the built middleware, or null when the app has none. */
  middleware: string | null;
  /** `dist/client/index.html`, inlined. */
  template: string;
  ssr: boolean;
  mountId: string;
  /** Paths that exist as prerendered HTML, so the platform can answer them itself. */
  prerendered: string[];
  /** URL pattern → built files, inlined: a worker cannot read the map off disk. */
  routeAssets: Record<string, string[]>;
}

/** Imports and the handler, shared by every platform entry. */
function preamble({ serverEntry, middleware, template, ssr, mountId, routeAssets }: EntrySource): string {
  return [
    `import { createHandlerFrom } from '@fluixi/start/handler-core';`,
    `import { createPreloader } from '@fluixi/start/preload';`,
    `import * as server from ${JSON.stringify(serverEntry)};`,
    middleware ? `import * as middleware from ${JSON.stringify(middleware)};` : '',
    ``,
    `const template = ${JSON.stringify(template)};`,
    // Inlined for the same reason as the template: this runs as an uploaded file, with
    // no dist/server beside it to read.
    `const routeAssets = ${JSON.stringify(routeAssets)};`,
    `const handler = createHandlerFrom({`,
    `  template,`,
    `  mod: server,`,
    `  cfg: { ssr: ${ssr}, mountId: ${JSON.stringify(mountId)} },`,
    `  preload: createPreloader(routeAssets),`,
    middleware ? `  middleware,` : '',
    `});`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Cloudflare Pages, advanced mode: a `_worker.js` at the root of the published
 * directory takes every request. Pages stops serving static files itself in that
 * mode, so assets go through the ASSETS binding, and `_routes.json` keeps the worker
 * out of the hot path for anything under a hashed asset directory.
 */
export function cloudflareEntry(source: EntrySource): string {
  return `${preamble(source)}

const prerendered = new Set(${JSON.stringify(source.prerendered)});

export default {
  async fetch(request, env, ctx) {
    // Static first, but only for what is static. ASSETS answers "/" with index.html
    // whether that is a prerendered page or the shell, so asking about every path
    // costs an SSR app its home page. Extension means a file, prerendered means a
    // page, the rest is the handler's: the rule \`withStaticFiles\` already uses.
    const { pathname } = new URL(request.url);
    if (env && env.ASSETS && (prerendered.has(pathname) || /\\.[^/]+$/.test(pathname))) {
      const asset = await env.ASSETS.fetch(request.clone());
      if (asset.status !== 404) return asset;
    }
    return handler(request, { env, ctx });
  },
};
`;
}

/**
 * Netlify Functions v2: a default-exported fetch handler. `config.path` claims every
 * route; Netlify still serves a matching static file first, so the function only sees
 * what the CDN could not answer.
 */
export function netlifyEntry(source: EntrySource): string {
  return `${preamble(source)}

export default async (request, context) => handler(request, { context });

export const config = { path: '/*', preferStatic: true };
`;
}

/**
 * Vercel Build Output API v3, Node runtime.
 *
 * The `Nodejs` launcher invokes the default export as `(req, res)`, so the entry
 * bridges the two itself. Exporting `(request) => Response` hangs instead of failing:
 * the launcher passes an `IncomingMessage`, nothing writes to `res`, and the request
 * sits until the platform times it out. Node rather than edge, so a server function
 * can use Node APIs.
 */
export function vercelEntry(source: EntrySource): string {
  return `${preamble(source)}

export default async (req, res) => {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) for (const one of value) headers.append(name, one);
    else if (value !== undefined) headers.set(name, value);
  }

  // A body has to be read off the stream before it can be handed to Request; only
  // GET and HEAD are guaranteed not to have one.
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length) body = new Blob(chunks);
  }

  const response = await handler(
    new Request(new URL(req.url, \`\${proto}://\${host}\`), { method: req.method, headers, body }),
  );

  res.statusCode = response.status;
  // set-cookie is the one header that legitimately repeats; folding it into one line
  // breaks the cookies.
  for (const [name, value] of response.headers) {
    if (name.toLowerCase() !== 'set-cookie') res.setHeader(name, value);
  }
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length) res.setHeader('set-cookie', cookies);

  if (response.body) for await (const chunk of response.body) res.write(chunk);
  res.end();
};
`;
}
