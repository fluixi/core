import { defineConfig } from '@fluixi/start/config';
import { nodeAdapter } from '@fluixi/start/adapter';

export default defineConfig({
  port: 3100,
  // `pnpm start` runs a Node process from this directory, so the framework can stay an
  // import instead of being copied into dist/server. Swap in webAdapter to get a single
  // self-contained file for edge/serverless.
  adapter: nodeAdapter,
});
