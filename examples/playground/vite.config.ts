import { defineConfig } from 'vite';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  // The Fluixi Vite plugin compiles JSX (imperative backend by default).
  plugins: [fluixi()],
  resolve: {
    // Load the workspace sources directly during dev.
    conditions: ['development', 'browser', 'import', 'default'],
  },
});
