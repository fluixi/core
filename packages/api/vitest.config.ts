import { defineConfig } from 'vitest/config';

// Node: routes run on the server, against the Web Request and Response a Node 18+ runtime has.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
  resolve: {
    conditions: ['development', 'import', 'default'],
  },
});
