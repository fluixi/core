/**
 * @fileoverview Public types for the framework-agnostic router core.
 *
 * The core is generic over the component payload type `C` — it never calls or
 * instantiates a component, it only carries the reference through to the match
 * result. A view adapter (kettlejs, react, …) decides what `C` is and how to
 * render it. This keeps the core pure and unit-testable with plain values.
 */

/** Loader invoked for a route's data (opaque to the core; adapters define args). */
export type RouteData = unknown;

/** A node in the route tree the application declares. */
export interface RouteDefinition<C = unknown> {
  /** Path pattern: static (`/users`), params (`/users/:id`), or wildcard (`/files/*`). */
  path: string;
  /** Opaque component reference for this layer (layout or page). Optional for pathless layout groups. */
  component?: C;
  /** Child routes nested under this one (a layout's pages/sub-layouts). */
  children?: RouteDefinition<C>[];
  /** Opaque data loader / metadata attached to this route. */
  data?: RouteData;
  /** Arbitrary adapter metadata (e.g. lazy markers). Ignored by the core. */
  meta?: Record<string, unknown>;
}

/** One matched layer of a route match, parent → child order in {@link RouteMatch.matched}. */
export interface MatchedRoute<C = unknown> {
  /** The route definition that matched at this layer. */
  route: RouteDefinition<C>;
  /** The component reference for this layer (may be undefined for pathless layouts). */
  component?: C;
  /** Params introduced AT THIS LAYER (not merged with ancestors). */
  params: Record<string, string>;
  /** Cumulative matched pathname up to and including this layer. */
  pathname: string;
}

/** The result of matching a pathname against a route tree. */
export interface RouteMatch<C = unknown> {
  /** Matched layers, parent → child. `matched[0]` is the outermost layout. */
  matched: MatchedRoute<C>[];
  /** All params merged across every matched layer. */
  params: Record<string, string>;
  /** The pathname that produced this match. */
  pathname: string;
}

/** A parsed location. `query` is the parsed `search`. */
export interface RouterLocation {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
  query: Record<string, string>;
}

/** Options for {@link Router.navigate}. */
export interface NavigateOptions {
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
  /** Opaque history state to attach. */
  state?: unknown;
}

/** A snapshot of the router's current state. */
export interface RouterState<C = unknown> {
  location: RouterLocation;
  match: RouteMatch<C> | null;
}

/** Pluggable history backend. Memory for tests/SSR, browser for the DOM. */
export interface HistoryAdapter {
  /** Read the current raw location. */
  get(): { pathname: string; search: string; hash: string; state: unknown };
  /** Push a new entry. `to` is a full path (may include search/hash). */
  push(to: string, state?: unknown): void;
  /** Replace the current entry. */
  replace(to: string, state?: unknown): void;
  /** Subscribe to external navigation (popstate). Returns an unsubscribe fn. */
  subscribe(onChange: () => void): () => void;
}

/** A router instance — a pure state machine over location + match. */
export interface Router<C = unknown> {
  /** Current snapshot. */
  state(): RouterState<C>;
  /** Subscribe to state changes. Returns an unsubscribe fn. */
  subscribe(listener: (state: RouterState<C>) => void): () => void;
  /** Navigate to a path. */
  navigate(to: string, options?: NavigateOptions): void;
  /** Pure match against this router's route tree (respects `base`). */
  match(pathname: string): RouteMatch<C> | null;
  /** Detach from history. */
  destroy(): void;
}

/** Config for {@link createRouter}. */
export interface RouterConfig<C = unknown> {
  routes: RouteDefinition<C>[];
  history: HistoryAdapter;
  /** Optional base path stripped from the pathname before matching. */
  base?: string;
}
