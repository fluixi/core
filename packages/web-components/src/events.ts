/**
 * Events out of the element.
 *
 * A custom element's public API is properties in, events out, and the events have to be
 * ordinary `CustomEvent`s or nothing outside will hear them. React's `onFoo` props,
 * Vue's `@foo` and Angular's `(foo)` all bind through `addEventListener`, so anything
 * proprietary here would cut the component off from every consumer it exists for.
 *
 * The defaults are the ones a component author almost always wants and almost always
 * forgets: an event that does not bubble is invisible to a parent, and one that is not
 * `composed` stops at the shadow boundary, which is exactly where it needs to escape.
 */

export interface DispatchInit extends Omit<CustomEventInit, 'detail'> {
  /** Defaults to true. */
  bubbles?: boolean;
  /** Defaults to true, so the event crosses a shadow root. */
  composed?: boolean;
  /** Defaults to false. Set it when `preventDefault()` should mean something. */
  cancelable?: boolean;
}

/** Emit a `CustomEvent` from the host. False when a listener cancelled it. */
export type Dispatch = <T = unknown>(type: string, detail?: T, init?: DispatchInit) => boolean;

export function createDispatch(host: EventTarget): Dispatch {
  return <T>(type: string, detail?: T, init: DispatchInit = {}): boolean =>
    host.dispatchEvent(
      new CustomEvent<T>(type, {
        bubbles: init.bubbles ?? true,
        composed: init.composed ?? true,
        cancelable: init.cancelable ?? false,
        detail: detail as T,
      }),
    );
}
