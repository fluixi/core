import { defineConfig } from '@fluixi/start/config';

export default defineConfig({
  port: 3100,
  // These resolve to workspace source through their `development` export condition, so
  // node cannot import them directly; going through vite lets it transform them first.
  ssrNoExternal: [/^@fluixi\//]
});
