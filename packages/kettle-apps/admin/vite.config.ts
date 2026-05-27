import {
  createVitePlugin,
  kettleRoutesPlugin,
  kettleElementPlugin,
} from '@awc/kettlejs/plugins';
import { defineConfig } from 'vite';
import awc from '@awc/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  server: { port: 3002 },
  css: { devSourcemap: true },
  build: { target: 'esnext' },
  ssr: { noExternal: true },
  resolve: {
    conditions: ['development'],
  },
  define: {
    "process.env.NODE_ENV": '"development"'
  },
  
  optimizeDeps: {
    include: ["@awc/components"]
    // include: ["@editorjs/editorjs", "@editorjs/header",  "@editorjs/list", "@editorjs/code", "@editorjs/quote", "@editorjs/checklist", "@editorjs/marker", "@editorjs/inline-code", "@editorjs/underline", "@editorjs/delimiter"]
  },
  plugins: [
    nodePolyfills({ include: ['fs'] }),
    kettleElementPlugin(),
    kettleRoutesPlugin({ routesDir: 'src/routes' }),
    createVitePlugin(),
    awc(),
  ],
});
