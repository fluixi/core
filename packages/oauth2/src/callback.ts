/**
 * The redirect URI route, as something an app does not have to write.
 *
 * `complete()` has always been here; the route around it was not, so every application
 * rewrote the same forty lines and met the same four traps. Each of these produced a page
 * that rendered and then did nothing, which is the worst failure to diagnose:
 *
 *  - Reading `location` while rendering. It does not exist on the server, so the two sides
 *    produce different markup, hydration finds a mismatch and keeps the server's version.
 *    The parameters then read as absent on a URL that has them.
 *  - Calling a router hook in the component body. `useNavigate` resolves the router during
 *    render, and a route that throws there fails to hydrate, leaving markup that responds to
 *    nothing. This navigates with `location.replace` instead, which needs no router at all.
 *  - Starting the exchange during render, so it runs once on the server and again in the
 *    browser.
 *  - Building the client from state that a page has not restored yet, which looks for a
 *    `state` this flow never stored and reports a mismatch.
 *
 * All of it happens in `onMount`, and every signal starts at a value the server can render.
 *
 * No JSX here: an app passes its own markup, so the package stays free of a JSX runtime and
 * the page looks like the rest of the application.
 */
import { onMount } from '@fluixi/core';
import { signal, type SignalHandle } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { AuthServiceToken } from './tokens.js';
import { paramsFromUrl } from './service.js';
import type { AuthService } from './service.js';
import type { CallbackParams } from './types.js';

/** Anything a fluixi renderer accepts as output. */
type ComponentChild = unknown;

/** How far the exchange got. */
export type CallbackStage = 'waiting' | 'exchanging' | 'signed-in' | 'failed';

export interface OAuthCallbackOptions {
  /**
   * The service to finish the flow with.
   *
   * Left out, it is injected from `AuthServiceToken`, which is what an app providing auth
   * through DI already registers. Pass one to skip DI, or when a page chooses between
   * several providers.
   */
  service?: AuthService<any, any, any> | (() => AuthService<any, any, any>);
  /**
   * The parameters to exchange. Read from `location` when absent.
   *
   * Only worth giving in a test, or when something has already consumed the URL.
   */
  params?: CallbackParams;
  /**
   * Where to go once signed in. Defaults to `location.replace`, which is deliberate: this
   * page exists for one transition, and a document navigation arrives with the session
   * already established and no router to resolve.
   *
   * Give a function to keep the visitor in the client router instead. It runs after mount,
   * so `useNavigate` is safe to have closed over from the route that renders this.
   */
  onSignedIn?: (destination: string) => void;
  /** Called when the exchange fails, for logging. The error is rendered either way. */
  onFailed?: (reason: string, cause: unknown) => void;
  /**
   * Whether to exchange at all. Checked on mount, so it may read the browser.
   *
   * For a route that is reached in more than one configuration: in server mode the provider
   * redirects to the middleware's own path and no exchange belongs here, and attempting one
   * produces a state mismatch that describes nothing real. Returning false leaves the stage
   * at `waiting` and sets no error, so the page can say why itself.
   */
  enabled?: () => boolean;
}

/** What the hook reports, all reactive. */
export interface CallbackState {
  /** How far it got. `waiting` until the browser takes over. */
  stage: SignalHandle<CallbackStage>;
  /** Why it stopped, or null. */
  error: SignalHandle<string | null>;
  /** Where it is going, once known. */
  destination: SignalHandle<string | null>;
  /** Everything the provider put on the URL, for a page that wants to show it. */
  params: SignalHandle<Record<string, string>>;
}

/** The message for a failure, preferring the provider's own words. */
function reasonFor(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return String(cause);
}

/**
 * Codes this document has already spent.
 *
 * An authorization code is single use, and the PKCE verifier is consumed with it, so a
 * second exchange of the same code fails and reports a state mismatch, which describes
 * nothing that is actually wrong. Anything that runs a component body more than once would
 * do that: a re-render, a remount, a development refresh.
 *
 * Module scope rather than a closure, because a closure is made fresh by the thing being
 * guarded against.
 */
const spent = new Set<string>();

/**
 * Finish a sign in on the redirect URI.
 *
 * Runs the exchange on mount and reports progress. Use this when the page needs its own
 * markup or wants to show what the provider sent; `OAuthCallback` wraps it for the common
 * case.
 *
 * @example
 * ```tsx
 * export default function Callback() {
 *   const { stage, error } = useOAuthCallback();
 *
 *   return (
 *     <main>
 *       <Show when={error} fallback={<p>Signing you in…</p>}>
 *         <h1>Could not sign you in</h1>
 *         <p>{error}</p>
 *         <a href="/login">Try again</a>
 *       </Show>
 *     </main>
 *   );
 * }
 * ```
 */
export function useOAuthCallback(options: OAuthCallbackOptions = {}): CallbackState {
  const stage = signal<CallbackStage>('waiting');
  const error = signal<string | null>(null);
  const destination = signal<string | null>(null);
  const params = signal<Record<string, string>>({});

  /**
   * Resolved now rather than on mount, because `inject` reads the owner scope that only
   * exists while a component is setting up. A server render where the app provides auth on
   * the client only has nothing to resolve, and nothing there needs it: the failure is
   * reported at mount, where it is visible.
   */
  /** The query string already reported, so a repeat pass writes nothing. */
  let lastQuery: string | null = null;

  let injected: AuthService<any, any, any> | null = null;
  let injectionError: unknown = null;
  if (!options.service) {
    try {
      injected = inject(AuthServiceToken) as AuthService<any, any, any>;
    } catch (cause) {
      injectionError = cause;
    }
  }

  onMount(() => {
    // Reported before anything else, because a provider that refused put its reason on the
    // URL and a page showing nothing is the alternative.
    //
    // Compared against a plain variable rather than by reading `params()`. A read here
    // subscribes whatever scope is running this to the signal, so the write that follows
    // schedules that scope again, which runs this again: the work is idempotent but the loop
    // is not. Writing only on a change is also what stops a fresh object, which never
    // compares equal, from waking every watcher on each pass.
    if (typeof location !== 'undefined') {
      const query = new URL(location.href).search;
      if (query !== lastQuery) {
        lastQuery = query;
        params.set(Object.fromEntries(new URL(location.href).searchParams.entries()));
      }
    }

    if (options.enabled && !options.enabled()) return;

    const service =
      typeof options.service === 'function' ? options.service() : (options.service ?? injected);

    if (!service) {
      stage.set('failed');
      error.set(
        'No auth service to finish the flow with. Provide `AuthServiceToken`, or pass `service` to useOAuthCallback.' +
          (injectionError ? ` Injection said: ${reasonFor(injectionError)}` : ''),
      );
      return;
    }

    const callback = options.params ?? paramsFromUrl();

    if (callback.error) {
      stage.set('failed');
      error.set(`${callback.error}: ${callback.errorDescription ?? 'no description given'}`);
      options.onFailed?.(callback.error, callback);
      return;
    }

    // One exchange per code. A second would spend a verifier that is already gone and
    // report a state mismatch for a flow that actually worked.
    if (callback.code) {
      if (spent.has(callback.code)) return;
      spent.add(callback.code);
    }

    stage.set('exchanging');
    void service
      .complete(callback)
      .then((target) => {
        destination.set(target);
        stage.set('signed-in');
        if (options.onSignedIn) options.onSignedIn(target);
        else if (typeof location !== 'undefined') location.replace(target);
      })
      .catch((cause: unknown) => {
        stage.set('failed');
        error.set(reasonFor(cause));
        options.onFailed?.(reasonFor(cause), cause);
      });
  });

  return { stage, error, destination, params };
}

export interface OAuthCallbackProps extends OAuthCallbackOptions {
  /** Shown while the exchange runs. A short line is usually right. */
  pending?: () => ComponentChild;
  /**
   * Shown when it fails, with the reason.
   *
   * Worth filling in. The default states the reason and offers nothing to do about it, and a
   * visitor who cannot get past this page needs a way back to the login.
   */
  failed?: (reason: string) => ComponentChild;
}

/**
 * A whole redirect-URI route.
 *
 * @example
 * ```tsx
 * // src/routes/callback/index.tsx, the entire file
 * import { OAuthCallback } from '@fluixi/oauth2/callback';
 *
 * export default OAuthCallback({
 *   pending: () => <p>Signing you in…</p>,
 *   failed: (reason) => (
 *     <>
 *       <h1>Could not sign you in</h1>
 *       <p>{reason}</p>
 *       <a href="/login">Try again</a>
 *     </>
 *   ),
 * });
 * ```
 */
export function OAuthCallback(props: OAuthCallbackProps = {}): () => ComponentChild {
  return () => {
    const { stage, error } = useOAuthCallback(props);

    return () => {
      if (stage() === 'failed') {
        const reason = error() ?? 'The sign in did not complete.';
        return props.failed ? props.failed(reason) : reason;
      }
      return props.pending ? props.pending() : null;
    };
  };
}
