import { defineConfig } from 'vitest/config';

// The DOM runtime needs a browser-like environment. jsdom is enough for the
// renderer contract tests (element creation, insert bindings, reconciliation).
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
  },
  resolve: {
    // load workspace sources directly (matches the "development" export condition)
    conditions: ['development', 'import', 'default'],
  },
});
