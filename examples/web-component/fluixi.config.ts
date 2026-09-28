import { defineConfig } from '@fluixi/start/config';

export default defineConfig({
  port: 3200,
  webComponents: {
    entries: [
      'src/elements/counter.ts',
      'src/elements/bounded-counter.ts',
      'src/elements/rating.ts',
      'src/elements/disclosure.ts',
    ],
  },
});
