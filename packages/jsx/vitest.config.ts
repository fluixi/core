import { defineConfig } from 'vitest/config';

// jsx() builds real DOM through @fluixi/dom, so the runtime tests need jsdom.
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
