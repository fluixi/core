import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'KettleJS',
      fileName: 'kettlejs',
    },
    rollupOptions: {
      external: ['lit', 'lit-html', '@awc/reactive'],
      output: {
        globals: {
          lit: 'Lit',
          '@awc/reactive': 'Reactive',
        },
      },
    },
  },
});
