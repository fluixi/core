// @fluixi/start owns the build plugins. This only resolves @fluixi/* to their TypeScript source.
export default {
  resolve: { conditions: ['development', 'browser', 'import', 'default'] },
};
