import { defineConfig } from 'vitest/config';

// A real browser for what jsdom does not implement: the form half of ElementInternals,
// custom states, delegatesFocus, focus order across shadow roots, the top layer.
export default defineConfig({
  test: {
    include: ['src/**/*.browser.spec.ts'],
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
  resolve: {
    conditions: ['development', 'import', 'default'],
  },
});
