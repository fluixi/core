import { defineConfig } from 'vitest/config';

// @fluixi/server is Node-only SSR: run under the node environment (no DOM),
// loading workspace sources directly (the "development" export condition) so
// @fluixi/server and @fluixi/dom share a single module instance.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
  resolve: {
    conditions: ['development', 'import', 'default'],
  },
});
