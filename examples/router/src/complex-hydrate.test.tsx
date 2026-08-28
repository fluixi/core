// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderToStringAsync, hydrate, createNativeElement, insert } from '@fluixi/dom';
import { lazy } from 'fluixi';
import { flush } from '@fluixi/reactive/signal';

const tick = async (ms = 60) => { await new Promise((r) => setTimeout(r, ms)); await flush(); };

// li with: text node + a nested <small> (the guestbook list-item shape)
const Item = () => {
  const li = createNativeElement('li') as any;
  insert(li, () => 'Welcome', null);
  const small = createNativeElement('small') as any;
  insert(small, () => '— system', null);
  insert(li, small, null);
  return li;
};

describe('complex-children hydration', () => {
  it('DIRECT hydrate: text + <small> keep order', async () => {
    const c = document.createElement('div'); document.body.appendChild(c);
    c.innerHTML = await renderToStringAsync(() => Item());
    console.log('SSR:', c.innerHTML);
    hydrate(() => Item(), c);
    await tick();
    console.log('HYDRATED:', c.innerHTML);
    expect(c.querySelector('li')!.textContent).toBe('Welcome— system');
  });

  it('LAZY hydrate: text + <small> keep order', async () => {
    const Lazy = lazy(async () => ({ default: Item }));
    const c = document.createElement('div'); document.body.appendChild(c);
    c.innerHTML = await renderToStringAsync(() => Lazy());
    hydrate(() => Lazy(), c);
    await tick();
    console.log('LAZY HYDRATED:', c.innerHTML);
    expect(c.querySelector('li')!.textContent).toBe('Welcome— system');
  });
});
