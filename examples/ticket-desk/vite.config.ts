// The fluixi build plugins (file routing, JSX/SSR transform, API routes) come from
// @fluixi/start. This file only carries the workspace concern: resolve @fluixi/* to
// TypeScript source via the `development` condition, so the example tracks the local
// packages without a build step.
export default {
  resolve: { conditions: ['development', 'browser', 'import', 'default'] },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
};
