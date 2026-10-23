import { defineConfig } from 'vitest/config';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  plugins: [fluixi()],
  resolve: {
    conditions: ['development', 'browser', 'import', 'default'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
