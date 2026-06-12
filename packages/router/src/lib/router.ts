/**
 * @fileoverview The router state machine.
 *
 * Pure: holds the current location + match, recomputes the match on every
 * history change, and notifies subscribers. Performs NO rendering — a view
 * adapter subscribes and renders the resolved match tree top-down (see DESIGN.md).
 */

import { matchRoutes } from './match.js';
import { splitPath } from './history.js';
import type {
  Router,
  RouterConfig,
  RouterLocation,
  RouterState,
  NavigateOptions,
  RouteMatch,
} from './types.js';

/** Parse a `?a=1&b=2` search string into an object. */
function parseQuery(search: string): Record<string, string> {
  const q: Record<string, string> = {};
  if (!search) return q;
  const usp = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search
  );
  usp.forEach((v, k) => (q[k] = v));
  return q;
}

/** Strip a base prefix from a pathname (so matching is base-relative). */
function stripBase(pathname: string, base?: string): string {
  if (!base) return pathname || '/';
  const b = base.replace(/\/$/, '');
  if (pathname === b) return '/';
  if (pathname.startsWith(b + '/')) return pathname.slice(b.length) || '/';
  return pathname || '/';
}

/** Prefix a base onto a target path for navigation. */
function withBase(to: string, base?: string): string {
  if (!base) return to;
  if (/^https?:\/\//.test(to)) return to;
  const b = base.replace(/\/$/, '');
  return `${b}${to.startsWith('/') ? to : '/' + to}`;
}

export function createRouter<C = unknown>(
  config: RouterConfig<C>
): Router<C> {
  const { routes, history, base } = config;
  const listeners = new Set<(state: RouterState<C>) => void>();

  const readLocation = (): RouterLocation => {
    const raw = history.get();
    return {
      pathname: raw.pathname,
      search: raw.search,
      hash: raw.hash,
      state: raw.state,
      query: parseQuery(raw.search),
    };
  };

  const computeMatch = (pathname: string): RouteMatch<C> | null =>
    matchRoutes(routes, stripBase(pathname, base));

  let current: RouterState<C> = (() => {
    const location = readLocation();
    return { location, match: computeMatch(location.pathname) };
  })();

  const recompute = () => {
    const location = readLocation();
    current = { location, match: computeMatch(location.pathname) };
    listeners.forEach((l) => l(current));
  };

  const unsubscribeHistory = history.subscribe(recompute);

  return {
    state() {
      return current;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    navigate(to: string, options: NavigateOptions = {}) {
      const target = withBase(to, base);
      // The history adapter notifies on push/replace (memory + browser), which
      // drives `recompute` via the subscription below — so we must NOT recompute
      // again here or subscribers would fire twice per navigation.
      if (options.replace) history.replace(target, options.state ?? null);
      else history.push(target, options.state ?? null);
    },
    match(pathname: string) {
      return computeMatch(pathname);
    },
    destroy() {
      unsubscribeHistory();
      listeners.clear();
    },
  };
}

/** Re-export the public helper for parsing a raw path. */
export { splitPath };
