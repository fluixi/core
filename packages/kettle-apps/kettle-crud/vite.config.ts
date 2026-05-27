import {
  createVitePlugin,
  kettleRoutesPlugin,
  kettleElementPlugin,
} from '@awc/kettlejs/plugins';
import { defineConfig } from 'vite';
import awc from '@awc/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
export default defineConfig({
  server: {
    port: 3000,
  },
  css: {
    devSourcemap: true,
  },
  define: {
    // "process.env.NODE_ENV": "'development'"
  },
  build: {
    target: 'esnext',
  },
  ssr: { noExternal: true },
  plugins: [
    nodePolyfills({
      include: ['fs'], // Polyfill spécifique pour fs
    }),
    kettleElementPlugin(),
    kettleRoutesPlugin({ routesDir: 'src/routes' }),
    createVitePlugin(),
    awc(),
  ],
});
