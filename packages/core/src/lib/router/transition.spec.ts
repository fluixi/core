// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  prepareComponents,
  prefersReducedMotion,
  runTransition,
  shouldAnimate,
  supportsViewTransitions,
} from './transition.js';

/**
 * The presentation layer on its own, away from a rendered router.
 *
 * These cover the decisions: does this environment animate, what does preparation
 * wait for, what happens when the browser refuses, because each one has a fallback
 * that has to keep navigation working, and a fallback nothing exercises is a fallback
 * that does not work.
 */

type Transition = {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition(): void;
};

const realStart = (document as any).startViewTransition;
const realMatchMedia = globalThis.window?.matchMedia;

/** A stand-in that behaves like the real API: runs the callback, then "animates". */
function installViewTransitions(): { calls: number } {
  const state = { calls: 0 };
  (document as any).startViewTransition = (cb: () => void | Promise<void>): Transition => {
    state.calls++;
    const updateCallbackDone = Promise.resolve(cb()).then(() => undefined);
    return {
      updateCallbackDone,
      ready: updateCallbackDone,
      finished: updateCallbackDone,
      skipTransition() {},
    };
  };
  return state;
}

function setReducedMotion(reduce: boolean): void {
  (window as any).matchMedia = (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
}

afterEach(() => {
  if (realStart) (document as any).startViewTransition = realStart;
  else delete (document as any).startViewTransition;
  if (realMatchMedia) (window as any).matchMedia = realMatchMedia;
  else delete (window as any).matchMedia;
  vi.restoreAllMocks();
});

describe('feature detection', () => {
  it('reports the API when the browser has it', () => {
    installViewTransitions();
    expect(supportsViewTransitions()).toBe(true);
  });

  it('reports its absence', () => {
    delete (document as any).startViewTransition;
    expect(supportsViewTransitions()).toBe(false);
  });

  it('is read per call, so a browser cannot be detected once and cached', () => {
    delete (document as any).startViewTransition;
    expect(supportsViewTransitions()).toBe(false);
    installViewTransitions();
    expect(supportsViewTransitions()).toBe(true);
  });
});

describe('reduced motion', () => {
  it('is respected when the reader asks for it', () => {
    setReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('is false by default', () => {
    setReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('survives a matchMedia that throws', () => {
    (window as any).matchMedia = () => {
      throw new Error('unsupported query');
    };
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('whether a commit animates', () => {
  it('does when supported and not opted out', () => {
    installViewTransitions();
    setReducedMotion(false);
    expect(shouldAnimate('auto')).toBe(true);
  });

  it('does not when asked for none', () => {
    installViewTransitions();
    setReducedMotion(false);
    expect(shouldAnimate('none')).toBe(false);
  });

  it('does not without the API', () => {
    delete (document as any).startViewTransition;
    setReducedMotion(false);
    expect(shouldAnimate('auto')).toBe(false);
  });

  it('does not when reduced motion is preferred, even on auto', () => {
    installViewTransitions();
    setReducedMotion(true);
    expect(shouldAnimate('auto')).toBe(false);
  });
});

describe('preparation', () => {
  it('is nothing to wait for when no component preloads', () => {
    expect(prepareComponents([() => null, undefined, null])).toBeNull();
  });

  it('waits for every preloadable component', async () => {
    const order: string[] = [];
    const a = Object.assign(() => null, {
      preload: () => Promise.resolve().then(() => void order.push('a')),
    });
    const b = Object.assign(() => null, {
      preload: () => Promise.resolve().then(() => void order.push('b')),
    });

    const pending = prepareComponents([a, b]);
    expect(pending).not.toBeNull();
    await pending;
    expect(order.sort()).toEqual(['a', 'b']);
  });

  it('resolves even when a module fails to load', async () => {
    const broken = Object.assign(() => null, {
      preload: () => Promise.reject(new Error('chunk 404')),
    });
    // A rejected import must surface through the route's own rendering, not by
    // leaving the navigation pending forever.
    await expect(prepareComponents([broken])).resolves.toBeUndefined();
  });

  it('resolves when a preload throws synchronously', async () => {
    const broken = Object.assign(() => null, {
      preload: () => {
        throw new Error('bad loader');
      },
    });
    expect(prepareComponents([broken])).toBeNull();
  });
});

describe('running the commit', () => {
  it('commits directly without the API', async () => {
    delete (document as any).startViewTransition;
    const commit = vi.fn();
    await runTransition('auto', commit);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('commits through the API when it applies', async () => {
    const state = installViewTransitions();
    setReducedMotion(false);
    const commit = vi.fn();
    await runTransition('auto', commit);
    expect(state.calls).toBe(1);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('bypasses the API for a direct navigation', async () => {
    const state = installViewTransitions();
    const commit = vi.fn();
    await runTransition('none', commit);
    expect(state.calls).toBe(0);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('waits for an async commit before resolving', async () => {
    installViewTransitions();
    setReducedMotion(false);
    let settled = false;
    await runTransition('auto', async () => {
      await Promise.resolve();
      settled = true;
    });
    expect(settled).toBe(true);
  });

  it('still commits when the browser refuses the call', async () => {
    (document as any).startViewTransition = () => {
      throw new Error('not allowed here');
    };
    setReducedMotion(false);
    const commit = vi.fn();
    await runTransition('auto', commit);
    // The DOM update is not optional just because the animation was.
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('does not reject when the animation is interrupted', async () => {
    (document as any).startViewTransition = (cb: () => void): Transition => {
      const updateCallbackDone = Promise.resolve(cb()).then(() => undefined);
      return {
        updateCallbackDone,
        ready: Promise.reject(new Error('skipped')),
        finished: Promise.reject(new Error('skipped')),
        skipTransition() {},
      };
    };
    setReducedMotion(false);
    const commit = vi.fn();
    await expect(runTransition('auto', commit)).resolves.toBeUndefined();
    expect(commit).toHaveBeenCalledTimes(1);
  });
});
