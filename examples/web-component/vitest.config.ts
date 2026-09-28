import { defineConfig } from 'vitest/config';

export default defineConfig({
  // `browser` so Svelte resolves its client runtime; the elements themselves are the built
  // files and resolve nothing.
  resolve: { conditions: ['browser'] },
  test: { environment: 'jsdom', include: ['tests/**/*.spec.ts'] },
});
