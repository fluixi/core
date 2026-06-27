import { defineConfig } from '@fluixi/start/config';

export default defineConfig({
  port: 3200,
  // SSG: `fluixi build` prerenders the landing to static HTML in dist/client.
  prerender: true,
});
