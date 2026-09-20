import { defineConfig } from '@fluixi/start/config';
import { nodeAdapter } from '@fluixi/start/adapter';

export default defineConfig({
  port: 3200,
  adapter: nodeAdapter,

  // Capitalised tags with no import in scope resolve here, so a route can drop in a
  // <StatusPill/> without an import line. One rule covers the whole directory.
  resolve: [{ match: /^([A-Z]\w+)$/, module: '/src/components/$1.tsx' }],

  // src/i18n/*.json is picked up as `virtual:fluixi-i18n`.
  i18n: { dir: 'src/i18n', defaultLocale: 'en', locales: ['en', 'fr'] },

  // The marketing pages are static. The desk itself stays server-rendered per request,
  // because its DI-backed data is per-user.
  prerender: { routes: ['/', '/about'], crawl: false },
});
