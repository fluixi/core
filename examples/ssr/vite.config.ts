import { defineConfig } from 'vitest/config';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  // Imperative backend — JSX compiles to the same runtime that renders on the
  // server (@fluixi/dom under isServer) and the client.
  plugins: [fluixi({codegen: 'ir', partialTemplates: true})],
  resolve: { conditions: ['development', 'browser', 'import', 'default'] },
  test: { environment: 'jsdom', include: ['src/**/*.test.tsx'] },
});
