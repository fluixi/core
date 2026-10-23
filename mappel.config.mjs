// Layers for @fluixi/cdn. The tool resolves and walks; this file says what goes
// in each map and what each one leaves to the others.

// What a page imports to build something by hand. `@fluixi/core` re-exports the
// common surface of dom and reactive, so one specifier covers most of it: the
// other entries are the graph behind it. `jsx` is absent on purpose: it is the
// runtime compiled output calls, and nothing compiles in a script-tag page.
const MIN = ['@fluixi/core', '@fluixi/dom', '@fluixi/utils'];

export default {
  workspaces: ['packages'],
  // where `mappel` writes, relative to this file
  out: 'packages/cdn/dist',
  // the 'full' layer below already is the combined map
  full: false,
  layers: {
    min: { packages: MIN },
    // Compiling html`` in the page, on top of the minimum.
    templates: { packages: ['@fluixi/template-runtime'], excludes: ['min'] },
    // Everything a browser can use. The node-only packages: start, cli, server,
    // vite-plugin, ts-plugin, the compiler's root entry: are not here.
    full: {
      packages: [...MIN, '@fluixi/template-runtime', '@fluixi/router', '@fluixi/head', '@fluixi/reactive'],
    },
  },
};
