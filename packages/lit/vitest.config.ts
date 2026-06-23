import { defineConfig } from 'vitest/config';

// The lit renderer drives real DOM via lit-html, so it needs a browser-like
// environment. jsdom is enough for the directive/control-flow reactivity tests.
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
