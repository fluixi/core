import { defineConfig } from 'vitest/config';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  // format: 'lit' compiles html`` templates through the shared IR + imperative
  // backend — the same pipeline JSX uses, so the output is the same runtime calls.
  plugins: [fluixi({ format: 'lit' })],
  resolve: {
    conditions: ['development', 'browser', 'import', 'default'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
