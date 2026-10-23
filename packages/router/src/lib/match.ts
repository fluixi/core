import type { MatchedRoute, RouteDefinition, RouteMatch } from './types.js';

/** Internal: result of matching a single pattern segment-prefix against a path. */
interface SegmentMatch {
  params: Record<string, string>;
  /** The portion of `path` consumed by `pattern`. */
  path: string;
}

/** Normalise accidental double slashes (`//x` → `/x`). */
function normalizePath(p: string): string {
  return p.startsWith('//') ? p.replace(/^\/+/, '/') : p;
}

/**
 * Match a single route `pattern` against `path`.
 *
 * - `exact` (leaf routes) anchors the end; non-exact (layouts) matches a prefix
 *   up to a `/` boundary so children can consume the rest.
 * - Supports `:param` and `*` / `*name` wildcards.
 */
export function matchPath(
  pattern: string,
  path: string,
  exact = false
): SegmentMatch | null {
  const keys: string[] = [];

  if (pattern === path) return { params: {}, path };
  if (!exact && pattern === '/' && path.startsWith('/'))
    return { params: {}, path: '/' };

  let regexStr = pattern
    .replace(/:([a-zA-Z0-9_]+)/g, (_, key: string) => {
      keys.push(key);
      return '([^/]+)';
    })
    .replace(/\*([a-zA-Z0-9_]*)/g, (_, name: string) => {
      if (name) keys.push(name);
      return '(.*)';
    });

  if (!regexStr.startsWith('/')) regexStr = '/' + regexStr;
  if (regexStr === '') regexStr = '/';

  const regex = new RegExp(`^${regexStr}${exact ? '$' : '(?=/|$)'}`);
  const match = path.match(regex);
  if (!match) return null;

  const params: Record<string, string> = {};
  keys.forEach((key, i) => {
    params[key] = match[i + 1];
  });
  return { params, path: match[0] };
}

/** Specificity score: static segments > params > wildcards. Higher = more specific. */
export function scoreRoute(def: RouteDefinition): number {
  const segments = def.path.split('/').filter(Boolean);
  if (segments.length === 0) return 5;
  let score = 0;
  for (const seg of segments) {
    if (seg.startsWith('*')) score += 1;
    else if (seg.startsWith(':')) score += 10;
    else score += 100;
  }
  return score;
}

/** Most-specific-first ordering, without mutating the input. */
export function rankRoutes<C>(defs: RouteDefinition<C>[]): RouteDefinition<C>[] {
  return [...defs].sort((a, b) => scoreRoute(b) - scoreRoute(a));
}

/** Match `pathname` against a route tree, returning the parent → child match. */
export function matchRoutes<C>(
  routes: RouteDefinition<C>[],
  pathname: string
): RouteMatch<C> | null {
  // Tolerate a trailing slash (static hosts like Cloudflare Pages canonicalise
  // `/a/b` → `/a/b/`). Leaf routes match exactly (`^...$`), so a stray `/` would
  // otherwise match nothing and render an empty root. Root `/` is preserved.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname;
  const result = matchInto<C>(routes, path);
  if (!result) return null;
  // Build the public match shape: cumulative pathnames + merged params.
  const matched: MatchedRoute<C>[] = [];
  let cumulative = '';
  const params: Record<string, string> = {};
  for (const layer of result.layers) {
    cumulative = normalizePath(joinMatched(cumulative, layer.consumed));
    // A layer's `params` is the DELTA it introduces, full-path nested routes
    // re-match ancestor params, but those belong to the ancestor layer, not here.
    const layerParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(layer.params)) {
      if (!(k in params)) layerParams[k] = v;
      params[k] = v;
    }
    matched.push({
      route: layer.route,
      component: layer.route.component,
      params: layerParams,
      pathname: cumulative || '/',
    });
  }
  return { matched, params, pathname };
}

/** Internal layer carrying the raw consumed segment for cumulative-path building. */
interface RawLayer<C> {
  route: RouteDefinition<C>;
  params: Record<string, string>;
  consumed: string;
}

function matchInto<C>(
  defs: RouteDefinition<C>[] | undefined,
  currentPath: string
): { layers: RawLayer<C>[] } | null {
  if (!defs || defs.length === 0) return null;
  const ranked = rankRoutes(defs);

  for (const def of ranked) {
    const hasChildren = !!def.children && def.children.length > 0;
    const seg = matchPath(def.path, currentPath, !hasChildren);
    if (!seg) continue;

    if (hasChildren) {
      const childMatch = matchInto<C>(def.children, currentPath);
      if (childMatch) {
        return {
          layers: [
            { route: def, params: seg.params, consumed: seg.path },
            ...childMatch.layers,
          ],
        };
      }
      // A layout matched the prefix but no child matched the remainder, keep
      // searching siblings (this layout is not the right branch).
      continue;
    }

    return { layers: [{ route: def, params: seg.params, consumed: seg.path }] };
  }
  return null;
}

/** Join the cumulative matched path with a layer's consumed segment. */
function joinMatched(cumulative: string, consumed: string): string {
  if (!cumulative) return consumed;
  if (consumed === cumulative) return cumulative;
  if (consumed.startsWith(cumulative)) return consumed;
  const a = cumulative.replace(/\/$/, '');
  const b = consumed.replace(/^\//, '');
  return `${a}/${b}`;
}
