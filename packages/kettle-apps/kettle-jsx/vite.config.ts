import { defineConfig } from 'vite';
import { createVitePlugin } from '@awc/kettlejs/plugins';

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
  plugins: [createVitePlugin()],
});
