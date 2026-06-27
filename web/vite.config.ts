// @fluixi/start owns the build plugins (routing + JSX/SSR). This only resolves @fluixi/* to
// their TypeScript source (the `development` condition) so the app tracks the local packages.
export default {
  resolve: { conditions: ['development', 'browser', 'import', 'default'] },
};
