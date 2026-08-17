import { defineConfig } from 'vitest/config';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  // No `resolve` rules at all. Both components are imported the ordinary way; the only
  // difference between them is how the rest of the file uses the name.
  plugins: [fluixi()],
  resolve: {
    conditions: ['development', 'browser', 'import', 'default'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 180_000,
  },
});
