import { defineConfig } from 'vitest/config';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  plugins: [
    fluixi({
      // Resolution: which module a capitalised tag comes from. Nothing in `src/App.tsx`
      // imports these components — the compiler injects the import, or a `deferred()`
      // binding when a `load:` directive says the module should wait.
      //
      // Not required for `load:` to work: a component you import yourself is deferred
      // too, by removing that import. This map is here because the example shows tags
      // with no import at all.
      resolve: [
        {
          components: {
            Summary: '/src/components/Summary.tsx',
            RevenueChart: '/src/components/RevenueChart.tsx',
            ExportDialog: '/src/components/ExportDialog.tsx',
            AuditLog: '/src/components/AuditLog.tsx',
          },
        },
      ],
    }),
  ],
  resolve: {
    conditions: ['development', 'browser', 'import', 'default'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
