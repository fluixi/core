import {
  createVitePlugin,
  kettleRoutesPlugin,
  kettleElementPlugin,
} from '@awc/kettlejs/plugins';
import { defineConfig } from 'vite';
import awc from '@awc/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  server: { port: 3001 },
  css: { devSourcemap: true },
  build: { target: 'esnext' },
  ssr: { noExternal: true },
  resolve: {
    conditions: ['development'],
  },
  plugins: [
    nodePolyfills({ include: ['fs'] }),
    kettleElementPlugin(),
    kettleRoutesPlugin({ routesDir: 'src/routes' }),
    createVitePlugin(),
    awc(),
  ],
});
