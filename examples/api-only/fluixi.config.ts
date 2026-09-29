import { defineConfig } from '@fluixi/start/config';

// An API service: src/api only, no pages, no entries to write.
export default defineConfig({
  apiOnly: true,
  port: 3400,
});
