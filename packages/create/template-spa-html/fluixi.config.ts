import { defineConfig } from '@fluixi/start/config';
import { nodeAdapter } from '@fluixi/start/adapter';

export default defineConfig({
  port: 3000,
  // Client-rendered: the server sends the page shell and the browser renders it. Server
  // functions, middleware and API routes still run on the server. `ssr: true` renders on
  // the server instead.
  ssr: false,
  // Where a capitalised tag with no import in scope comes from. One pattern covers
  // the whole folder, so a new component needs no config, `fluixi g component Card`
  // and `<Card />` just works. Delete this if you'd rather import every component.
  resolve: [{ match: /^([A-Z]\w+)$/, module: '/src/components/$1.ts' }],
  // `pnpm start` runs a Node process from this directory, so the framework stays an
  // import rather than being copied into dist/server. Swap in a deploy adapter , 
  // cloudflare, netlify, vercel: to get the layout that platform expects.
  adapter: nodeAdapter,
});
