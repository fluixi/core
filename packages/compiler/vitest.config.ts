import { defineConfig } from 'vitest/config';

// The imperative-codegen tests compile JSX and execute the output against the
// real @fluixi/dom runtime, so they need a browser-like environment.
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
