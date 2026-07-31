import { describe, it, expect, beforeAll } from 'vitest';
import * as S from '@fluixi/reactive/signal';
import * as Store from '@fluixi/reactive/store';
import { initializeIntegration } from './integration.js';
import { createNativeElement, insert } from './runtime.js';

// Step-1 safety net for the "compiled fine-grained renderer" migration:
// prove dom/runtime.ts (createNativeElement + insert + reactive binding) works
// end-to-end, since the compiler currently bypasses it.
//
// NOTE: we wire reactive -> dom manually here instead of importing the
// '@fluixi/dom' barrel, because 9 dom source files self-import that barrel and
// create a circular dependency that crashes under source loading
// (src/index.ts reads _DOM.createComponent at module top-level). Breaking that
// cycle (relative imports) is a tracked migration task.
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

describe('dom runtime contract', () => {
  it('creates a native element', () => {
    const el = createNativeElement('div') as HTMLElement;
    el.textContent = 'hi';
    document.body.appendChild(el);
    expect(document.body.querySelector('div')?.textContent).toBe('hi');
  });

  it('insert binds a reactive accessor and updates the DOM', async () => {
    await new Promise<void>((resolve, reject) => {
      S.createRoot(() => {
        const [count, setCount] = S.createSignal(0);
        const host = createNativeElement('div') as HTMLElement;
        document.body.appendChild(host);
        insert(host, count as any);
        expect(host.textContent).toContain('0');
        setCount(1);
        S.flush()
          .then(() => {
            expect(host.textContent).toContain('1');
            resolve();
          })
          .catch(reject);
      });
    });
  });
  it('insert binds a reactive array containing accessor and updates the DOM', async () => {
    // For example when call <CardTile>{()=>a}} {()=>b}</CardTitle> does not keep reactivity when the children is an array containing reactive values
    // on the first render because the last guard bare check type of accessor as function inside insert method
    // Resolved by introducing another guard isReactiveArray to lookup if the accessor is an array that contain reactive values
    // so they will reach the effect
    await new Promise<void>((resolve, reject) => {
      S.createRoot(async () => {
        const [count, setCount] = S.createSignal(0);
        const [count1, setCount1] = S.createSignal(1);
        const host = createNativeElement('div') as HTMLElement;
        document.body.appendChild(host);
        insert(host, [count, count1] as any);
        expect(host.textContent).toContain('0');
        expect(host.textContent).toContain('1');
        setCount(2);
        await S.flush();
        expect(host.textContent).toContain('2');
        setCount1(3);
        await S.flush();
        expect(host.textContent).toContain('3');
        resolve();
      });
    });
  });
});
