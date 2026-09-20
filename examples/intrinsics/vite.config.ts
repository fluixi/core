import { defineConfig } from 'vitest/config';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  // `intrinsics` is on by default: `$signal` is a compile error otherwise, so there is
  // nothing for it to break.
  plugins: [fluixi()],
  resolve: {
    conditions: ['development', 'browser', 'import', 'default'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
  },
});
