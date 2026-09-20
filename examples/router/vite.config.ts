import { defineConfig } from 'vitest/config';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  // Use the imperative backend: this example is the regression for lazy routes
  // rendering inside providers (owner nesting / lazy component children).
  plugins: [fluixi()],
  resolve: { conditions: ['development', 'browser', 'import', 'default'] },
  test: { environment: 'jsdom', include: ['src/**/*.test.tsx'] },
});
