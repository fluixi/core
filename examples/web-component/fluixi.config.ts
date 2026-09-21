import { defineConfig } from '@fluixi/start/config';

export default defineConfig({
  webComponents: {
    entries: ['src/elements/counter.ts', 'src/elements/disclosure.ts'],
  },
});
