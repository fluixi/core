import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/jobs',
  plugins: [],
  test: {
    passWithNoTests: true,
    name: '@fluixi/jobs',
    watch: false,
    // pg-boss on PGlite starts a database and migrates it inside the first test; a CI runner needs longer than 5s.
    testTimeout: 30_000,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
  },
}));
