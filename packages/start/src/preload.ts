/**
 * Which built files a URL is going to need.
 *
 * Preloading depends on nothing but the path, so this is a plain function of it rather
 * than something threaded through the render — the answer is known before a component
 * runs. The map is keyed by URL pattern because the server cannot turn a path into a
 * module on its own: the route table lives inside the bundle it is serving, and
 * `@fluixi/core/routes` resolves to a stub outside the build. `fluixi build` does that
 * join instead, with each route\'s layouts already folded in.
 *
 * A miss is silent by design. An app with no file routes, a path that matches nothing,
 * a build from before any of this existed — each yields no files, and the page is served
 * exactly as it was.
 */
import { matchRoutes } from '@fluixi/core/router-next';

/** URL pattern → the built files a request for it needs. */
export type RouteAssets = Record<string, string[]>;

/** Build the lookup a handler applies per request. */
export function createPreloader(assets: RouteAssets | undefined): (pathname: string) => string[] {
  const patterns = Object.keys(assets ?? {});
  if (!patterns.length) return () => [];

  // Matching goes through the router rather than a string compare, so `/blog/:id` and
  // wildcards resolve the way they do when the app itself routes the request.
  const routes = patterns.map((path) => ({ path, meta: { path } }));

  return (pathname) => {
    const matched = matchRoutes(routes, pathname)?.matched;
    const leaf = matched?.[matched.length - 1];
    const pattern = (leaf?.route.meta as { path?: string } | undefined)?.path;
    return pattern ? (assets![pattern] ?? []) : [];
  };
}
