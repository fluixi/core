// The fluixi build plugins (file routing + JSX/SSR transform) are provided by
// @fluixi/start, NOT here. This vite.config only carries the workspace-dev concern:
// resolve @fluixi/* to their TypeScript source (the `development` export condition)
// so the example tracks the local packages without a build step.
export default {
  resolve: { conditions: ['development', 'browser', 'import', 'default'] },
};
