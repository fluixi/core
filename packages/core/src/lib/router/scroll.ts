/**
 * The window's scroll across client navigations, as a full page load would leave it: a new
 * page starts at the top, or at its `#hash`; back and forward return to where the reader
 * was; a reload stays where it was.
 *
 * The router keeps the current page on screen until the next one has loaded its data, so
 * the browser's own restoration, applied when the URL changes, would scroll the page being
 * left. The router turns it off and scrolls once the next page is shown.
 */
import type { RouterLocation } from '@fluixi/router';

const STORE = 'fx:scroll';
// Positions kept for this many entries, the most recent ones.
const KEEP = 100;

export interface ScrollKeeper {
  /** A navigation started: remember where the entry being left was scrolled to. */
  leave(): void;
  /** The page for `location` is on screen. */
  arrive(location: RouterLocation, from: RouterLocation | undefined): void;
  dispose(): void;
}

export function keepScroll(initial: RouterLocation): ScrollKeeper {
  const read = (): Record<string, number> => {
    try {
      return JSON.parse(sessionStorage.getItem(STORE) ?? '{}') as Record<string, number>;
    } catch {
      return {};
    }
  };
  const positions = read();
  const write = () => {
    const keys = Object.keys(positions);
    for (const key of keys.slice(0, Math.max(0, keys.length - KEEP))) delete positions[key];
    try {
      sessionStorage.setItem(STORE, JSON.stringify(positions));
    } catch {
      // Storage full or refused: positions still hold for this page's life.
    }
  };

  let current = initial.key;
  const save = () => {
    if (current === undefined) return;
    delete positions[current];
    positions[current] = window.scrollY;
    write();
  };

  const restoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  // A reload or a tab closed and reopened: the entry keeps its position.
  window.addEventListener('pagehide', save);

  // Instant, as a page load lands, whatever `scroll-behavior` the page's CSS sets: a smooth
  // scroll would animate from where the last page was.
  const to = (top: number) => window.scrollTo({ top, left: 0, behavior: 'instant' });
  const toHash = (hash: string): boolean => {
    if (!hash || hash === '#') return false;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    target?.scrollIntoView({ behavior: 'instant' });
    return target !== null;
  };

  return {
    leave: save,
    arrive(location, from) {
      current = location.key;
      if (location.action === 'pop' || from === undefined) {
        const y = location.key === undefined ? undefined : positions[location.key];
        if (y !== undefined) to(y);
        return;
      }
      // A replace on the same page (a filter in the query) leaves the reader where they are.
      if (location.action === 'replace' && location.pathname === from.pathname) return;
      if (!toHash(location.hash)) to(0);
    },
    dispose() {
      window.removeEventListener('pagehide', save);
      history.scrollRestoration = restoration;
    },
  };
}
