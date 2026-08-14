import { defineConfig } from '@fluixi/start/config';
import { nodeAdapter } from '@fluixi/start/adapter';

export default defineConfig({
  port: 3000,
  // `pnpm start` runs a Node process from this directory, so the framework stays an
  // import rather than being copied into dist/server. Swap in a deploy adapter —
  // cloudflare, netlify, vercel — to get the layout that platform expects.
  adapter: nodeAdapter,
});
