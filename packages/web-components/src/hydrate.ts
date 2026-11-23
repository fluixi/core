/**
 * Element hydration: a Fluixi custom element the server rendered adopts the server's nodes
 * instead of rendering them again. Imported for its effect, in the client entry of an app that
 * server-renders elements; `@fluixi/start` adds it when this package is installed.
 *
 *   import '@fluixi/web-components/hydrate';
 */
import { HYDRATION_KEY, afterHydrationPass, hydrateChildren, isAppHydrationPending, setKeyScope, whenAppHydrated } from '@fluixi/dom';
import { installElementHydration } from './element.js';

installElementHydration({
  hydrate(element, render) {
    // The scope the server rendered this content in: the element's own, named after its key.
    setKeyScope(`${element.getAttribute(HYDRATION_KEY) ?? ''}~`);
    hydrateChildren(element, render);
  },
  wait(resume) {
    let cancelled = false;
    let stop: () => void = () => {};
    queueMicrotask(() => {
      if (cancelled) return;
      if (isAppHydrationPending()) stop = whenAppHydrated(() => !cancelled && resume());
      else resume();
    });
    return () => {
      cancelled = true;
      stop();
    };
  },
  afterPass: afterHydrationPass,
  pending: isAppHydrationPending,
  whenDone: (fn) => void whenAppHydrated(fn),
});
