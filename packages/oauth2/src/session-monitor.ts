/**
 * OpenID Connect Session Management, the app's half.
 *
 * The provider's check page sits in a hidden iframe. The page posts it `client_id` and the
 * `session_state` of the last authorization answer; the check page recomputes that value
 * from the provider's own cookie and answers `changed` or `unchanged`, with no request.
 * `changed` means someone signed in, out, or switched account at the provider since: the
 * app asks again silently, which signs it in, out, or as the other account.
 *
 * Only on the same site as the provider, or where the browser lets a framed page read its
 * cookies. Elsewhere the check page sees no cookie and answers `changed` at once, every
 * time: the guard below tells that apart from a real change, which follows an `unchanged`.
 */

export interface SessionCheck {
  /** The provider's check page, or null when it has none. */
  frame: string | null;
  clientId: string;
  /** The last answer's `session_state`, or null when there is nothing to compare. */
  state: string | null;
}

export interface WatchOptions {
  /** Where the server routes are mounted. Default `/auth`. */
  basePath?: string;
  /** How often to ask while the page is visible. Default 3 seconds. */
  intervalMs?: number;
  /** What a change does. Default: a silent sign-in that returns to this page. */
  onChange?: () => void;
  fetcher?: typeof fetch;
}

/**
 * A page whose first answer is `changed` within this long of the last silent sign-in is
 * looking at a provider whose cookie it cannot read, and stops instead of looping.
 */
const SETTLE_MS = 15_000;
const GUARD_KEY = 'fx-session-check';

function recentlyActed(): boolean {
  try {
    return Date.now() - Number(sessionStorage.getItem(GUARD_KEY) ?? 0) < SETTLE_MS;
  } catch {
    return false;
  }
}

function markActed(): void {
  try {
    sessionStorage.setItem(GUARD_KEY, String(Date.now()));
  } catch {
    // Storage refused: the loop guard is lost, the check itself still works.
  }
}

/** Starts watching; returns a function that stops. Does nothing outside a browser. */
export function watchProviderSession(options: WatchOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  const base = (options.basePath ?? '/auth').replace(/\/$/, '');
  const fetcher = options.fetcher ?? fetch;
  const onChange =
    options.onChange ??
    (() => {
      const login = new URLSearchParams({ prompt: 'none', returnTo: location.pathname + location.search });
      location.assign(`${base}/login?${login}`);
    });

  let stopped = false;
  const cleanups: Array<() => void> = [];
  const stop = () => {
    stopped = true;
    for (const cleanup of cleanups.splice(0)) cleanup();
  };

  void (async () => {
    const check = (await fetcher(`${base}/session-check`, { credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)) as SessionCheck | null;
    if (stopped || !check?.frame || !check.state) return;

    const origin = new URL(check.frame).origin;
    const frame = document.createElement('iframe');
    frame.src = check.frame;
    frame.title = 'session check';
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    const message = `${check.clientId} ${check.state}`;
    const ask = () => {
      if (!stopped && document.visibilityState === 'visible') frame.contentWindow?.postMessage(message, origin);
    };

    let confirmed = false;
    const answer = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.contentWindow) return;
      if (event.data === 'unchanged') confirmed = true;
      else if (event.data === 'changed') {
        stop();
        if (!confirmed && recentlyActed()) return;
        markActed();
        onChange();
      } else if (event.data === 'error') {
        stop();
      }
    };
    window.addEventListener('message', answer);
    frame.addEventListener('load', ask);
    document.addEventListener('visibilitychange', ask);
    window.addEventListener('focus', ask);
    const timer = setInterval(ask, options.intervalMs ?? 3000);
    document.body.appendChild(frame);
    cleanups.push(() => {
      window.removeEventListener('message', answer);
      document.removeEventListener('visibilitychange', ask);
      window.removeEventListener('focus', ask);
      clearInterval(timer);
      frame.remove();
    });
  })();

  return stop;
}
