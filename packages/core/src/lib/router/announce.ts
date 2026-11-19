/**
 * What a full page load gives a screen reader and a client navigation does not: the new page
 * is announced, and the reader continues from its start.
 *
 * The live region sits in a `<fluixi-route-announcer>` host on `document.body`, outside the
 * app, with its own shadow root: no render, navigation or hydration replaces it, the app's CSS
 * cannot make it visible, and it exists before its first change, which is when screen readers
 * start listening to it. The host is not a registered custom element, only a container.
 */
import type { RouterLocation } from '@fluixi/router';

/** Where focus goes once the new page is on screen. */
export type AnnounceFocus = 'main' | 'h1' | false;

export interface AnnounceOptions {
  /** Default `'main'`: the page's `<main>`, made focusable with `tabindex="-1"` if needed. */
  focus?: AnnounceFocus;
}

export interface RouteAnnouncer {
  /** A navigation started: remember the title of the page being left. */
  leave(): void;
  /** The page for `location` is on screen. */
  arrive(location: RouterLocation, from: RouterLocation | undefined): void;
  dispose(): void;
}

const HIDDEN =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';

/** The announcer of the router on screen, for `announce()`. One router per page. */
let active: { say(text: string): void; navigating(): boolean; override(text: string): void } | null = null;

export function createRouteAnnouncer(options: AnnounceOptions = {}): RouteAnnouncer {
  const focus = options.focus ?? 'main';
  const host = document.createElement('fluixi-route-announcer');
  const region = document.createElement('div');
  region.setAttribute('aria-live', 'assertive');
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('role', 'alert');
  region.setAttribute('style', HIDDEN);
  host.attachShadow({ mode: 'open' }).append(region);
  document.body.append(host);

  let leftTitle = document.title;
  let pending = false;
  let custom: string | null = null;

  const say = (text: string): void => {
    // Only a change is spoken: the same text written again would be ignored or repeated.
    if (text && region.textContent !== text) region.textContent = text;
  };

  const self = {
    say,
    navigating: () => pending,
    override: (text: string) => void (custom = text),
  };
  active = self;

  return {
    leave() {
      pending = true;
      leftTitle = document.title;
    },
    arrive(location, from) {
      pending = false;
      const text = custom;
      custom = null;
      // The first page is announced by the browser; a change of hash or query on the same page
      // (a tab, a filter) is not a new page.
      if (from === undefined || location.pathname === from.pathname) return;
      const heading = document.querySelector('h1')?.textContent?.trim();
      say(text ?? (document.title !== leftTitle && document.title ? document.title : heading || location.pathname));
      // A `#hash` already took the reader to its target.
      if (focus && !location.hash) {
        const target = document.querySelector<HTMLElement>(focus);
        if (target) {
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
      }
    },
    dispose() {
      host.remove();
      if (active === self) active = null;
    },
  };
}

/**
 * Say `text` to screen readers. During a navigation it replaces what the router would announce
 * for the new page (`announce('Search results: 12 orders')` from a route's component);
 * otherwise it is spoken now (a list filtered, an item saved).
 */
export function announce(text: string): void {
  if (!active) return;
  if (active.navigating()) active.override(text);
  else active.say(text);
}
