import { describe, it, expect, beforeAll } from 'vitest';
import * as S from '@fluixi/reactive/signal';
import * as Store from '@fluixi/reactive/store';
import { initializeIntegration, registerCreateComponent, createComponent } from './integration.js';
import { createNativeElement, insert, spread, delegateEvents } from './runtime.js';
import { Show } from '../flow/show.js';
import { For } from '../flow/for.js';

// Step-3 of the compiled-fine-grained migration: lock the runtime contract the
// compiler will target in Step 5 (so codegen has a tested surface to emit into).
// Covers attribute/prop spread, event delegation, component instantiation and a
// control-flow component, the staples of compiled JSX output.
beforeAll(() => {
  initializeIntegration({
    signalSystem: {
      ...(S as any),
      resolveChildren: (S as any).childrens,
      createComponent: null,
    } as any,
    storeSystem: {
      isStore: (Store as any).isStore,
      isStoreProxy: (Store as any).isStoreProxy,
      unwrap: (v: any) => v,
    } as any,
  });
});

describe('spread', () => {
  it('applies static + reactive attributes', async () => {
    await new Promise<void>((resolve, reject) => {
      S.createRoot(() => {
        const [cls, setCls] = S.createSignal('a');
        const el = createNativeElement('div') as HTMLElement;
        spread({ element: el, props: { id: 'x', class: cls } } as any);
        expect(el.getAttribute('id')).toBe('x');
        expect(el.className).toBe('a');
        setCls('b');
        S.flush().then(() => {
          expect(el.className).toBe('b');
          resolve();
        }).catch(reject);
      });
    });
  });

  it('SVG element: an attribute that collides with a read-only DOM property uses setAttribute', () => {
    // The codegen doesn't flag nested SVG elements (<linearGradient>, <stop>), so spread gets
    // isSVG=false. For a real SVG node, a key like `x1` is `in element` (a read-only
    // SVGAnimatedLength), the old `!isSVG && key in element` check took the property branch and
    // threw "Cannot set property x1". spread must detect SVG by namespaceURI and use setAttribute.
    S.createRoot(() => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      // jsdom may not implement x1; define a getter-only prop to reproduce the read-only collision.
      Object.defineProperty(el, 'x1', { get: () => undefined, configurable: true });
      expect(() => spread({ element: el, props: { x1: '0', x2: '1' } } as any)).not.toThrow();
      expect(el.getAttribute('x1')).toBe('0');
      expect(el.getAttribute('x2')).toBe('1');
    });
  });
});

describe('event delegation', () => {
  it('invokes a $$-delegated handler on a bubbled event', () => {
    delegateEvents(['click']);
    const btn = createNativeElement('button') as HTMLElement;
    let n = 0;
    (btn as any).$$click = () => { n++; };
    document.body.appendChild(btn);
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(n).toBe(1);
  });
});

describe('createComponent', () => {
  it('routes through the registered component system', () => {
    registerCreateComponent(((Comp: any, props: any) => Comp(props)) as any);
    const Comp = (p: any) => {
      const s = createNativeElement('span') as HTMLElement;
      s.textContent = p.label;
      return s;
    };
    const node = createComponent(Comp as any, { label: 'hi' } as any) as HTMLElement;
    expect(node.textContent).toBe('hi');
  });
});

describe('Show', () => {
  it('swaps children/fallback reactively', async () => {
    await new Promise<void>((resolve, reject) => {
      S.createRoot(() => {
        const [on, setOn] = S.createSignal(true);
        const host = createNativeElement('div') as HTMLElement;
        insert(host, Show({ when: on, children: () => 'yes', fallback: 'no' } as any) as any);
        expect(host.textContent).toContain('yes');
        setOn(false);
        S.flush().then(() => {
          expect(host.textContent).toContain('no');
          resolve();
        }).catch(reject);
      });
    });
  });
});

describe('For', () => {
  it('renders a reactive list and reconciles on change', async () => {
    await new Promise<void>((resolve, reject) => {
      S.createRoot(() => {
        const [items, setItems] = S.createSignal(['a', 'b']);
        const host = createNativeElement('ul') as HTMLElement;
        insert(
          host,
          For({
            each: items,
            children: (item: string) => {
              const li = createNativeElement('li') as HTMLElement;
              li.textContent = item;
              return li;
            },
          } as any) as any,
        );
        expect(host.querySelectorAll('li').length).toBe(2);
        setItems(['a', 'b', 'c']);
        S.flush().then(() => {
          expect(host.querySelectorAll('li').length).toBe(3);
          expect(host.textContent).toContain('c');
          resolve();
        }).catch(reject);
      });
    });
  });
});
