import { defineConfig } from 'vitest/config';

// The plugin's transform() just runs babel; node env is enough.
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.spec.ts'] },
  resolve: { conditions: ['development', 'import', 'default'] },
});
