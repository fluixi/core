import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  // The spike (prototype.html) is a second entry so the working playground keeps its own
  // monaco. Both are built; neither imports the other.
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        prototype: fileURLToPath(new URL('./prototype.html', import.meta.url)),
      },
    },
  },
  // fluixi() compiles the playground's OWN .tsx (the chrome). User snippets are compiled at
  // runtime by @babel/standalone (src/compile.ts).
  plugins: [fluixi()],
  resolve: {
    conditions: ['development', 'browser', 'import', 'default'],
    alias: {
      // The compiler's babel frontend imports @babel/core, an optional peer it expects the
      // consumer to supply. In a page that is @babel/standalone — see src/babel-core.ts.
      '@babel/core': fileURLToPath(new URL('./src/babel-core.ts', import.meta.url)),
    },
  },
  optimizeDeps: {
    // @babel/standalone is a large prebundle; include the babel plugin too.
    include: ['@babel/standalone'],
  },
});
