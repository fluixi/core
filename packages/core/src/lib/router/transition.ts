/**
 * Navigation presentation: preparing a route before it is shown, and handing the DOM
 * swap to the browser's View Transition API when there is one.
 *
 * ## The lifecycle this replaces
 *
 * Navigation used to be one synchronous chain. `navigate()` pushed history, the core
 * router recomputed the match and notified, the `Router` component wrote the match
 * signal, and the render memo rebuilt the layer at the depth that changed. The old DOM
 * came out at that moment: whether or not the new route had anything to put in its
 * place:
 *
 *   - a route with a `data` loader renders `null` until the resource resolves,
 *   - a `lazy()` route whose chunk is not loaded suspends to the nearest fallback.
 *
 * Both are an empty intermediate state with the old page already gone, which is what
 * reads as a flash. It is not a paint-timing artifact and no animation would hide it.
 *
 * ## The lifecycle now
 *
 *   navigation-start
 *        │  the match is computed, but not committed
 *   prepare
 *        │  every matched layer's module is loaded (`lazy().preload()`), so the
 *        │  component renders synchronously instead of suspending
 *   begin transition
 *        │  `document.startViewTransition`, when it applies
 *   commit
 *        │  the match signal is written and effects are flushed, inside the
 *        │  transition's callback, so the browser snapshots a settled DOM
 *   navigation-complete
 *
 * Nothing here delays anything. The commit happens as soon as preparation resolves; on
 * a warm route that is the same tick it always was.
 */

/** What the browser exposes when it can animate a DOM swap. */
interface ViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition(): void;
}

type StartViewTransition = (
  callback: () => void | Promise<void>,
) => ViewTransition;

/** How a navigation should be presented. */
export type TransitionMode = 'auto' | 'none';

/**
 * Whether this environment can animate a route swap.
 *
 * Read at call time rather than cached at module load: a test swaps the API in and out,
 * and a cached answer would make the second case unreachable.
 */
export function supportsViewTransitions(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof (document as Document & { startViewTransition?: StartViewTransition })
      .startViewTransition === 'function'
  );
}

/**
 * Whether the reader asked not to be animated.
 *
 * A stated preference outranks the app's configuration, so this is checked on every
 * navigation rather than once: the setting can change while the page is open.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    // A matchMedia that throws on an unknown query is not a reason to fail navigation.
    return false;
  }
}

/** Whether this particular commit should go through a view transition. */
export function shouldAnimate(mode: TransitionMode): boolean {
  return mode !== 'none' && supportsViewTransitions() && !prefersReducedMotion();
}

/**
 * Load what the next route needs to render without suspending.
 *
 * Only the route's own modules. Data loaders are deliberately left alone: the resource
 * belongs to the layer's owner and is created when that layer renders, so calling the
 * loader here would either run the request twice or require a cache this router does not
 * own. See the note in the router on what that leaves.
 *
 * A module that fails to load resolves anyway. Preparation is an optimisation, and a
 * rejected import should surface through the route's own error handling when it renders,
 * not by leaving the navigation permanently pending.
 */
export function prepareComponents(components: readonly unknown[]): Promise<void> | null {
  const pending: Promise<unknown>[] = [];

  for (const component of components) {
    const preload = (component as { preload?: () => Promise<unknown> } | undefined)
      ?.preload;
    if (typeof preload === 'function') {
      try {
        const result = preload();
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          pending.push((result as Promise<unknown>).catch(() => undefined));
        }
      } catch {
        // A preload that throws synchronously is the same as one that rejects.
      }
    }
  }

  // Null rather than a resolved promise: the caller commits synchronously when there is
  // nothing to wait for, which keeps a warm navigation on the tick it was already on.
  return pending.length ? Promise.all(pending).then(() => undefined) : null;
}

/**
 * Run `commit` inside a view transition, or directly when one does not apply.
 *
 * The callback is async because writing the match signal only queues the work: effects
 * are scheduled, so the DOM is not settled when the write returns. `startViewTransition`
 * waits for the returned promise before snapshotting the new state, so flushing inside
 * it is what makes the browser compare two finished frames rather than one finished and
 * one half-built.
 *
 * The returned promise resolves when the DOM has been updated, not when the animation
 * ends. A caller waiting on navigation wants the former; blocking on the latter would
 * make every navigation as slow as its animation.
 */
export function runTransition(
  mode: TransitionMode,
  commit: () => void | Promise<void>,
): Promise<void> {
  if (!shouldAnimate(mode)) {
    return Promise.resolve(commit()).then(() => undefined);
  }

  const start = (document as Document & { startViewTransition: StartViewTransition })
    .startViewTransition;

  try {
    const transition = start.call(document, () => commit());
    // Swallow the rejections a skipped or interrupted transition produces. Both of
    // these reject when the animation is cut short, by `skipTransition()`, by another
    // navigation starting, or by the tab going to the background. The DOM update inside
    // the callback still happened, so a navigation must not fail because an animation
    // did not play, and an unobserved rejection here would surface as an unhandled one.
    transition.finished?.catch(() => undefined);
    transition.ready?.catch(() => undefined);
    return transition.updateCallbackDone.catch(() => undefined);
  } catch {
    // A browser that has the method but refuses the call still has to navigate.
    return Promise.resolve(commit()).then(() => undefined);
  }
}
