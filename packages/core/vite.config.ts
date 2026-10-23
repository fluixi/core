import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['development', 'browser', 'module', 'import', 'default'],
  },
  test: {
    watch: false,
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'Fluixi',
      fileName: 'fluixi',
    },
    rollupOptions: {
      external: ['@fluixi/reactive'],
      output: {
        globals: {
          '@fluixi/reactive': 'Reactive',
        },
      },
    },
  },
});
