import { defineConfig } from 'vite';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  plugins: [
    fluixi({
      // Where a capitalised tag with no import in scope comes from. One pattern covers
      // the whole folder, so a new component needs no config, `fluixi g component Card`
      // and `<Card />` just works. Delete this if you'd rather import every component.
      resolve: [{ match: /^([A-Z]\w+)$/, module: '/src/components/$1.tsx' }],
    }),
  ],
});
