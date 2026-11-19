/**
 * Hot reload with keepState: a `defineElement` setup keeps its signals across a new version, and
 * a class element defined again keeps its instances (and their fields) with the new methods.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { createHotModule } from '@fluixi/dom/hot';
import { effect, flush, signal } from '@fluixi/reactive/signal';

const para = (text: () => string): HTMLElement => {
  const p = document.createElement('p');
  effect(() => void (p.textContent = text()));
  return p;
};
import { HTMLReactiveElement, defineCustomElement, defineElement } from './index.js';

// What the dev transform emits for a module when the app keeps state.
createHotModule({ data: {}, invalidate: () => {} }, 'elements.ts', { keepState: true });

afterAll(() => {
  document.body.innerHTML = '';
});

describe('custom elements under hot reload with keepState', () => {
  it('keeps a defineElement setup signals across a new version', () => {
    let bump!: () => void;
    const setup = (word: string) => () => {
      const n = signal(0);
      bump = () => n.set(n() + 1);
      return para(() => `${word} ${n()}`);
    };
    defineElement('fx-keep-count', setup('one') as never);
    const el = document.createElement('fx-keep-count');
    document.body.append(el);
    bump();
    bump();
    flush();
    expect(el.textContent).toBe('one 2');

    defineElement('fx-keep-count', setup('two') as never);
    flush();
    expect(el.textContent).toBe('two 2');
    // A file with `// @refresh reset`: its transform resets before the body, its hot setup after.
    (globalThis as Record<symbol, { reset(on: boolean): void }>)[Symbol.for('fluixi.hot')].reset(true);
    defineElement('fx-keep-count', setup('three') as never);
    createHotModule({ data: {}, invalidate: () => {} }, 'elements.ts', { keepState: true });
    flush();
    expect(el.textContent).toBe('three 0');
  });

  it('moves a redefined class methods onto the registered class, keeping the instance', () => {
    class First extends HTMLReactiveElement {
      clicks = 3;
      protected override render(): unknown {
        return para(() => `first ${this.clicks}`);
      }
    }
    class Second extends HTMLReactiveElement {
      clicks = 0;
      protected override render(): unknown {
        return para(() => `second ${this.clicks}`);
      }
    }
    expect(defineCustomElement('fx-keep-class', First)).toBe(First);
    const el = document.createElement('fx-keep-class') as First;
    document.body.append(el);
    el.clicks = 5;
    expect(el.textContent).toBe('first 3');

    expect(defineCustomElement('fx-keep-class', Second)).toBe(First);
    expect(el).toBeInstanceOf(First);
    expect(el.textContent).toBe('second 5');
  });
});
