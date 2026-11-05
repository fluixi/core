/**
 * `throw redirect('/organisations')` in a route's data: the reader belongs elsewhere. On the
 * server the response becomes a redirect before the page is sent; in the browser the router
 * replaces the address. A page streamed before its data settled redirects from the page.
 */

/** Recognised across copies of this module, as a server bundle and node_modules each load one. */
const MARK = Symbol.for('fluixi.routeRedirect');

export const REDIRECT_STATUSES = [301, 302, 303, 307, 308] as const;
export type RedirectStatus = (typeof REDIRECT_STATUSES)[number];

export class RouteRedirect extends Error {
  readonly [MARK] = true;
  constructor(
    readonly to: string,
    readonly status: RedirectStatus = 303,
  ) {
    super(`Redirect to ${to}`);
    this.name = 'RouteRedirect';
  }
}

/** Ends a route's data load by sending the reader to `to`; 303 unless `status` says otherwise. */
export function redirect(to: string, options: { status?: RedirectStatus } = {}): never {
  throw new RouteRedirect(to, options.status ?? 303);
}

export const isRouteRedirect = (value: unknown): value is RouteRedirect =>
  typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[MARK] === true;
