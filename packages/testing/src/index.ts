/**
 * @fluixi/testing: minimal helpers for testing Fluixi components.
 *
 * `render` mounts a component into a jsdom container and hands back a disposer
 * plus query shorthands; `flush` awaits pending effects; `fireEvent` dispatches
 * a bubbling event (so delegated `on*` handlers fire). Pair it with vitest
 * (`environment: 'jsdom'`) and, for richer queries, `@testing-library/dom`.
 */
import { render as domRender, insert, renderToString } from '@fluixi/dom';
import { flush } from '@fluixi/reactive/signal';

export interface RenderOptions {
  /** Mount into this element instead of a fresh <div> appended to document.body. */
  container?: HTMLElement;
}

export interface RenderResult {
  /** The element the component was rendered into. */
  container: HTMLElement;
  /** Dispose the reactive root and detach the container. */
  unmount: () => void;
  /** `container.querySelector` shorthand. */
  find: (selector: string) => Element | null;
  /** `container.querySelectorAll` shorthand, as an array. */
  findAll: (selector: string) => Element[];
  /** The container's current innerHTML. */
  html: () => string;
}

/**
 * Render a Fluixi component into the DOM for testing.
 *
 * @example
 *   const { find, unmount } = render(() => <Counter start={2} />);
 *   fireEvent(find('button')!, 'click');
 *   await flush();
 *   expect(find('output')!.textContent).toBe('3');
 *   unmount();
 */
export function render(
  code: () => unknown,
  options: RenderOptions = {}
): RenderResult {
  const attached = !options.container;
  const container = options.container ?? document.createElement('div');
  if (attached) document.body.appendChild(container);

  const dispose = domRender(code as never, container);

  return {
    container,
    unmount: () => {
      dispose();
      if (attached) container.remove();
    },
    find: (selector) => container.querySelector(selector),
    findAll: (selector) => Array.from(container.querySelectorAll(selector)),
    html: () => container.innerHTML,
  };
}

/**
 * Dispatch a bubbling, cancelable event on a node, sugar over
 * `node.dispatchEvent`. Bubbling matters because Fluixi delegates `on*` handlers.
 */
export function fireEvent(
  node: Element,
  type: string,
  init: EventInit = {}
): boolean {
  return node.dispatchEvent(
    new Event(type, { bubbles: true, cancelable: true, ...init })
  );
}

export { flush, renderToString, insert };
export { flush as flushEffects };
