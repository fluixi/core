/**
 * Which built files a URL needs.
 *
 * Keyed by URL pattern, not module id: the server only has a path, and the route table
 * that would map one to the other lives inside the bundle it is serving , 
 * `@fluixi/core/routes` resolves to a stub outside a build. `fluixi build` does the
 * join, with each route's layouts folded in.
 *
 * A miss is silent: no file routes, no match, or an older build yields no files and an
 * unchanged page.
 */
import { matchRoutes } from '@fluixi/core/router';

/** URL pattern → the built files a request for it needs. */
export type RouteAssets = Record<string, string[]>;

/** Build the lookup a handler applies per request. */
export function createPreloader(assets: RouteAssets | undefined): (pathname: string) => string[] {
  const patterns = Object.keys(assets ?? {});
  if (!patterns.length) return () => [];

  // Through the router, not a string compare, so `/blog/:id` and wildcards resolve as
  // they do when the app routes the request.
  const routes = patterns.map((path) => ({ path, meta: { path } }));

  return (pathname) => {
    const matched = matchRoutes(routes, pathname)?.matched;
    const leaf = matched?.[matched.length - 1];
    const pattern = (leaf?.route.meta as { path?: string } | undefined)?.path;
    return pattern ? (assets![pattern] ?? []) : [];
  };
}
