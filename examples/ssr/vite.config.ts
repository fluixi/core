import { defineConfig } from 'vitest/config';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  // JSX compiles to the same runtime that renders on the server (@fluixi/dom
  // under isServer) and on the client.
  plugins: [fluixi()],
  resolve: { conditions: ['development', 'browser', 'import', 'default'] },
  test: { environment: 'jsdom', include: ['src/**/*.test.tsx'] },
});
