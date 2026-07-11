import { defineConfig } from 'vitest/config';

// The re-exported control flow touches the DOM runtime, so tests run in jsdom.
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
