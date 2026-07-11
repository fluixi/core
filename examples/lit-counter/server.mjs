// Runnable SSR server for the html``-authored app: Vite in middleware mode
// compiles the lit templates on the fly (format:'lit'); @fluixi/server renders
// SsrApp to HTML per request; the client entry then hydrates.
// Run: `pnpm --filter @fluixi/example-lit-counter serve`, then open the URL.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { createServer as createHttp } from 'node:http';

const PORT = 5176;
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

const template = readFileSync(new URL('./index.html', import.meta.url), 'utf-8');

const http = createHttp((req, res) => {
  vite.middlewares(req, res, async () => {
    try {
      const url = req.url || '/';
      // Load the app + the SSR renderer through Vite (html`` compiled, source deps).
      const { SsrApp } = await vite.ssrLoadModule('/src/Ssr.ts');
      const { renderRequestAsync } = await vite.ssrLoadModule('@fluixi/server');

      const appHtml = await renderRequestAsync(SsrApp, { url });
      const html = await vite.transformIndexHtml(
        url,
        template.replace('<!--ssr-outlet-->', appHtml),
      );

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      res.statusCode = 500;
      res.end(String(e?.stack || e));
    }
  });
});

http.listen(PORT, () => {
  console.log(`Fluixi lit-html SSR example → http://localhost:${PORT}`);
});
