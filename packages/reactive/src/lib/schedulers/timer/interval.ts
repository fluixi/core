import { TimerHandle } from "./type.js";

type IntervalFn = (handler: () => void, timeout?: number, ...args: any[]) => TimerHandle;
type ClearIntervalFn = (handle: TimerHandle) => void;

interface IntervalProvider {
  setInterval: IntervalFn;
  clearInterval: ClearIntervalFn;
  delegate:
    | {
        setInterval: IntervalFn;
        clearInterval: ClearIntervalFn;
      }
    | undefined;
}

export const intervalProvider: IntervalProvider = {
  // When accessing the delegate, use the variable rather than `this` so that
  // the functions can be called without being bound to the provider.
  setInterval(handler: () => void, timeout?: number, ...args) {
    const { delegate } = intervalProvider;
    if (delegate?.setInterval) {
      return delegate.setInterval(handler, timeout, ...args);
    }
    return (setInterval as IntervalFn)(handler, timeout, ...args);
  },
  clearInterval(handle) {
    const { delegate } = intervalProvider;
    return (delegate?.clearInterval || clearInterval)(handle as any);
  },
  delegate: undefined,
};