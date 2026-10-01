// @vitest-environment jsdom
/** ErrorBoundary catches an error thrown after the first render, not only while building. */
import { describe, it, expect } from 'vitest';
import { createMemo, createRoot, createSignal, flush } from '@fluixi/reactive/signal';
import { render } from '../dom/runtime.js';
import { ErrorBoundary } from './error-boundary.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
/** Mounted as an app is: one memo around the view, so a change in it does not rebuild it. */
const mount = (view: () => unknown, container: Element) => createRoot(() => render(createMemo(view) as never, container));

describe('ErrorBoundary', () => {
  it('shows the fallback when a child accessor starts throwing', async () => {
    const [fail, setFail] = createSignal(false);
    const container = document.createElement('div');
    mount(
      () =>
        ErrorBoundary({
          fallback: (e: unknown) => `caught: ${(e as Error).message}`,
          get children() {
            return ['ok ', () => {
              if (fail()) throw new Error('boom');
              return 'fine';
            }];
          },
        }),
      container,
    );
    expect(container.textContent).toBe('ok fine');
    setFail(true);
    flush();
    await tick();
    expect(container.textContent).toBe('caught: boom');
  });

  it('catches a throw while the children are built', () => {
    const container = document.createElement('div');
    mount(
      () =>
        ErrorBoundary({
          fallback: 'caught',
          get children() {
            throw new Error('at build');
          },
        }),
      container,
    );
    expect(container.textContent).toBe('caught');
  });
});
