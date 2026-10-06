/**
 * @fluixi/router: framework-agnostic router core.
 *
 * Routing as pure state: URL → resolved match tree + navigation. No reactivity,
 * no DOM, no view framework. View adapters subscribe and render the match tree
 * top-down (see DESIGN.md).
 */

export type {
  RouteDefinition,
  MatchedRoute,
  RouteMatch,
  RouterLocation,
  HistoryAction,
  NavigateOptions,
  RouterState,
  HistoryAdapter,
  Router,
  RouterConfig,
  RouteData,
} from './lib/types.js';

export { matchRoutes, matchPath, scoreRoute, rankRoutes } from './lib/match.js';
export {
  createMemoryHistory,
  createBrowserHistory,
  splitPath,
} from './lib/history.js';
export { createRouter } from './lib/router.js';
