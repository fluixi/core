import { defineConfig } from '@fluixi/start/config';

export default defineConfig({
  port: 3300,
  // SSG: prerender all version/lang/slug pages (crawled from the home redirect + sidebar links).
  prerender: true,
});
