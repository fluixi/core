// @fluixi/start owns the build plugins (routing + JSX/SSR). This only resolves @fluixi/* to
// their TypeScript source (the `development` condition) so the app tracks the local packages.
import fluixiCss from '@fluixi-css/vite';

export default {
  resolve: { conditions: ['development', 'browser', 'import', 'default'] },
  // Component <style> blocks. No app theme: the site's CSS reads its own custom properties.
  plugins: [fluixiCss({ theme: false })],
};
