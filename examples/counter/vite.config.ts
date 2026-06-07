import { defineConfig } from 'vitest/config';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  // The KettleJS Vite plugin compiles JSX (default 'jsx' backend).
  plugins: [fluixi({backend: 'imperative', codegen: 'ir'})],
  resolve: {
    // load the workspace sources directly during dev/test
    conditions: ['development', 'browser', 'import', 'default'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
  },
});
