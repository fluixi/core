import { defineConfig } from 'vite';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  // fluixi() compiles the playground's OWN .tsx (the chrome). User snippets are compiled at
  // runtime by @babel/standalone (src/compile.ts).
  plugins: [fluixi()],
  resolve: {
    conditions: ['development', 'browser', 'import', 'default'],
  },
  optimizeDeps: {
    // @babel/standalone is a large prebundle; include the babel plugin too.
    include: ['@babel/standalone'],
  },
});
