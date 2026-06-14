// Minimal runnable SSR server: Vite in middleware mode compiles the JSX app on
// the fly; @fluixi/server renders it to HTML per request; the client entry then
// takes over. Run: `pnpm --filter @fluixi/example-ssr serve` then open the URL.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { createServer as createHttp } from 'node:http';

const PORT = 5174;
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

const template = readFileSync(new URL('./index.html', import.meta.url), 'utf-8');

const http = createHttp((req, res) => {
  vite.middlewares(req, res, async () => {
    try {
      const url = req.url || '/';
      // Load the app + the SSR renderer through Vite (JSX compiled, source deps).
      const { App } = await vite.ssrLoadModule('/src/App.tsx');
      const { renderRequestAsync } = await vite.ssrLoadModule('@fluixi/server');

      const appHtml = await renderRequestAsync(App, { url });
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
  console.log(`Fluixi SSR example → http://localhost:${PORT}`);
});
