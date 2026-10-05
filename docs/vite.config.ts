// @fluixi/start owns the build plugins. This only resolves @fluixi/* to their TypeScript source.
import fluixiCss from '@fluixi-css/vite';

export default {
  resolve: { conditions: ['development', 'browser', 'import', 'default'] },
  // Component <style> blocks. No app theme: the site's CSS reads its own custom properties.
  plugins: [fluixiCss({ theme: false })],
};
