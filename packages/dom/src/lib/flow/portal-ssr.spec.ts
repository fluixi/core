// @vitest-environment jsdom
/**
 * A Portal on the server renders nothing, instead of failing the page's server render on
 * `document`; in the browser it mounts once the page has hydrated, in the context around it.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createContext, createRoot, useContext } from '@fluixi/reactive/signal';
import { createComponent, createNativeElement, insert, renderToString } from '@fluixi/dom';
import { Portal } from './portal.js';
import { hydration } from '../dom/hydration-state.js';
import { setServerMode } from '../dom/server/host.js';

afterEach(() => {
  setServerMode(false);
  hydration.active = false;
  document.body.innerHTML = '';
});

const flushMicrotasks = () => new Promise<void>((r) => queueMicrotask(r));

describe('Portal', () => {
  it('renders nothing on the server, and builds none of its children', () => {
    let built = false;
    const Dialog = () => {
      built = true;
      return 'dialog';
    };
    const Page = () => {
      const main = createNativeElement('main');
      insert(main, ['page', createComponent(Portal as never, { get children() { return createComponent(Dialog, {}); } } as never)]);
      return main;
    };
    const html = renderToString(Page);
    expect(html).toContain('page');
    expect(html).not.toContain('dialog');
    expect(built).toBe(false);
  });

  it('mounts after hydration, seeing the context around it', async () => {
    const Theme = createContext('light');
    hydration.active = true;
    createRoot(() =>
      Theme.Provider({
        value: 'dark',
        get children() {
          return Portal({ children: () => `theme ${useContext(Theme)}` });
        },
      }),
    );
    // Nothing during the pass: the server sent nothing to match.
    expect(document.body.textContent).toBe('');
    hydration.active = false;
    await flushMicrotasks();
    expect(document.body.textContent).toBe('theme dark');
  });

  it('never mounts when removed before hydration ended', async () => {
    hydration.active = true;
    createRoot((dispose) => {
      Portal({ children: 'gone' });
      dispose();
    });
    hydration.active = false;
    await flushMicrotasks();
    expect(document.body.textContent).toBe('');
  });
});
