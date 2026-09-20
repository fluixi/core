import { describe, it, expect, beforeEach } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { jsx, Fragment } from './jsx-runtime.js';

// Step 6 lock: jsx() must instantiate components through the framework's
// registered createComponent (from @fluixi/dom), the same path the imperative
// backend uses: rather than a private untrack(() => Comp(props)).

function resolve(node: any): any {
  return typeof node === 'function' ? node() : node;
}

describe('jsx() component instantiation', () => {
  beforeEach(() => {
    DOM.resetIntegration?.();
    // re-init the dom<->reactive integration the way the barrel auto-init does
    (DOM as any).initializeIntegration?.({
      signalSystem: { ...(S as any), resolveChildren: (S as any).childrens, createComponent: null },
      storeSystem: { isStore: () => false, isStoreProxy: () => false, unwrap: (v: any) => v },
    });
  });

  it('routes components through the registered createComponent', () => {
    let calls = 0;
    DOM.registerCreateComponent(((Comp: any, props: any) => {
      calls++;
      return Comp(props);
    }) as any);

    const Greeting = (p: any) => {
      const s = DOM.createNativeElement('span') as HTMLElement;
      s.textContent = p.label;
      return s;
    };

    S.createRoot(() => {
      const node = resolve(jsx(Greeting as any, { label: 'hi' }));
      expect(calls).toBeGreaterThan(0);
      expect((node as HTMLElement).tagName).toBe('SPAN');
      expect((node as HTMLElement).textContent).toBe('hi');
    });
  });

  it('builds native elements directly (no component path)', () => {
    let calls = 0;
    DOM.registerCreateComponent(((Comp: any, props: any) => {
      calls++;
      return Comp(props);
    }) as any);

    const el = resolve(jsx('div', { id: 'x' })) as HTMLElement;
    expect(el.tagName).toBe('DIV');
    expect(el.id).toBe('x');
    expect(calls).toBe(0);
  });
});
