/**
 * @fileoverview Router module exports for KettleJS framework
 * @module @awc/kettlejs/router
 */

export {
  Router,
  Routes,
  Route,
  Outlet,
  Link,
  A,
  Redirect,
  useRouter,
  useLocation,
  useNavigate,
  useParams,
  useMatch,
  useSearchParams,
} from './router.js';

export {
  cache,
  action,
  revalidate,
  createAsync,
  useSubmission,
  useAction,
  useRouteData,
} from './data.js';

export type {
  Location,
  NavigateOptions,
  Navigator,
  RouterContextValue,
  RouteContextValue,
  RouteDefinition,
} from './router.js';

export type {
  CacheFn,
  Action,
  Submission,
  RouteDataArgs,
  RouteLoadFunc,
} from './data.js';

export { createFileRoutes } from './fs-router.js';
export type { FileRouterOptions } from './fs-router.js';

export {lazy} from "../render/lazy.js"
export { runWithOwner } from '@awc/reactive/signal';
