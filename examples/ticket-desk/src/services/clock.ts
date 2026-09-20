/** Time, behind a token, so a test can pin it instead of racing `Date.now()`. */
export interface Clock {
  now(): number;
  iso(): string;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  iso: () => new Date().toISOString(),
};

/** A clock stuck at one instant. Used by the tests and by the prerendered pages. */
export function fixedClock(at: number): Clock {
  return { now: () => at, iso: () => new Date(at).toISOString() };
}
