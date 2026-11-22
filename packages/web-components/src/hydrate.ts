/**
 * Element hydration: a Fluixi custom element the server rendered adopts the server's nodes
 * instead of rendering them again. Imported for its effect, in the client entry of an app that
 * server-renders elements; `@fluixi/start` adds it when this package is installed.
 *
 *   import '@fluixi/web-components/hydrate';
 */
import { HYDRATION_KEY, hydrateChildren, setKeyScope } from '@fluixi/dom';
import { installElementHydration } from './element.js';

installElementHydration({
  hydrate(element, render) {
    // The scope the server rendered this content in: the element's own, named after its key.
    setKeyScope(`${element.getAttribute(HYDRATION_KEY) ?? ''}~`);
    hydrateChildren(element, render);
  },
});
