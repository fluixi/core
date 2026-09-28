import { defineConfig } from 'vitest/config';

// jsdom: custom elements, shadow roots and the upgrade sequence are the thing under
// test, so the tests need a real CustomElementRegistry rather than a stub.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    exclude: ['src/**/*.browser.spec.ts'],
  },
  resolve: {
    conditions: ['development', 'import', 'default'],
  },
});
