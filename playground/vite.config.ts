import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  // monaco-vscode-api's workers are ES modules and cannot be bundled as iife.
  worker: { format: 'es' },
  // prototype.html is the monaco-vscode-api spike. Dev serves it; the production build
  // leaves it out, because those packages reach for node builtins (@vscode/diff imports
  // node:fs/promises) and making that bundle is its own piece of work.
  // fluixi() compiles the playground's OWN .tsx (the chrome). User snippets are compiled at
  // runtime by @babel/standalone (src/compile.ts).
  plugins: [fluixi()],
  resolve: {
    conditions: ['development', 'browser', 'import', 'default'],
    alias: {
      // The compiler's babel frontend imports @babel/core, an optional peer it expects the
      // consumer to supply. In a page that is @babel/standalone, see src/babel-core.ts.
      '@babel/core': fileURLToPath(new URL('./src/babel-core.ts', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      // The preview iframe loads its bootstrap by url at runtime, so it is an entry of its
      // own: nothing imports it, and without this the build never emits it and the iframe
      // asks a static host for a source file it does not have.
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        bootstrap: fileURLToPath(new URL('./src/preview/bootstrap.ts', import.meta.url)),
      },
      output: {
        // Unhashed, because `run.ts` has to name it before the build exists.
        entryFileNames: (chunk) =>
          chunk.name === 'bootstrap' ? 'preview/bootstrap.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  optimizeDeps: {
    // @babel/standalone is a large prebundle; include the babel plugin too.
    include: ['@babel/standalone'],
  },
  // The playground has real logic worth pinning: linking, resolution, and the source-map
  // composition the devtools cards depend on.
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
  },
});
