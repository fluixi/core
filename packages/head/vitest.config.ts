import { defineConfig } from 'vitest/config';

// jsdom so the client reconciler tests have a real document.head.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
  },
  resolve: {
    // load @fluixi/* workspace sources directly (the "development" export condition)
    conditions: ['development', 'import', 'default'],
  },
});
