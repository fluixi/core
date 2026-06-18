import { createServer as createHttp } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FluixiConfig } from '../config.js';
import { resolveConfig } from '../config.js';
import { injectApp, installCrashGuards } from '../internal.js';
import { createRequestHandler, toNodeHandler } from '../handler.js';

const MIME: Record<string, string> = {
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

/**
 * Production server: serve built static assets from dist/client, and SSR every
 * other request through the built server entry. Run after `fluixi build`.
 */
export async function start(config: FluixiConfig = {}): Promise<void> {
  const cfg = resolveConfig(config);
  installCrashGuards();

  const clientDir = resolve(cfg.root, 'dist/client');
  const template = await readFile(join(clientDir, 'index.html'), 'utf-8');
  const serverEntry = resolve(cfg.root, 'dist/server', 'entry-server.js');
  const mod = await import(pathToFileURL(serverEntry).href);
  const render = mod.render ?? mod.default;

  // App render → the same runtime-neutral fetch handler dev uses (and adapters consume).
  const handler = createRequestHandler(async (url) =>
    injectApp(template, await render(url), cfg.mountId),
  );
  const nodeHandler = toNodeHandler(handler);

  const http = createHttp(async (req, res) => {
    const url = req.url || '/';
    // Static asset → serve from dist/client; otherwise SSR via the handler.
    const pathname = url.split('?')[0];
    if (pathname !== '/' && extname(pathname)) {
      const file = join(clientDir, pathname);
      try {
        if ((await stat(file)).isFile()) {
          res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
          createReadStream(file).pipe(res);
          return;
        }
      } catch { /* fall through to SSR */ }
    }
    await nodeHandler(req, res);
  });

  http.listen(cfg.port, () =>
    console.log(`  fluixi start → http://localhost:${cfg.port}`),
  );
}
