// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderToString } from '@fluixi/server';
import { hydrate } from '@fluixi/dom';
import { PartialApp } from './PartialApp';

/**
 * Partial templates address nodes by walking the clone. Hydration walks the server's DOM
 * instead, so the two only agree if the marker comments make both the same shape. These
 * are the shapes where that would break first.
 */
describe('hydrating a partial template', () => {
  const setup = () => {
    const html = renderToString(() => PartialApp());
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = html;
    return container;
  };

  it('renders the holes on the server', () => {
    const container = setup();
    expect(container.querySelector('.title')!.textContent).toBe('Ada');
    expect(container.querySelector('.mid')!.textContent).toBe('before Ada after');
    expect(container.querySelector('.multi')!.textContent).toBe('Ada and 7 together');
  });

  it('reuses the server nodes instead of rebuilding', () => {
    const container = setup();
    const title = container.querySelector('.title');
    const wrap = container.querySelector('.wrap');
    hydrate(() => PartialApp(), container);
    expect(container.querySelector('.title')).toBe(title);
    expect(container.querySelector('.wrap')).toBe(wrap);
  });

  it('does not duplicate hole content', () => {
    const container = setup();
    hydrate(() => PartialApp(), container);
    expect(container.querySelectorAll('.partial')).toHaveLength(1);
    expect(container.querySelector('.title')!.textContent).toBe('Ada');
    // The failure this guards against is "AdaAda" — client content appended beside the
    // server's instead of adopting it.
    expect(container.querySelector('.mid')!.textContent).toBe('before Ada after');
    expect(container.querySelector('.multi')!.textContent).toBe('Ada and 7 together');
  });

  it('keeps static siblings after a hole in place', () => {
    const container = setup();
    hydrate(() => PartialApp(), container);
    expect(container.querySelector('.tail')!.textContent).toBe('static tail');
    expect(container.querySelectorAll('.tail')).toHaveLength(1);
  });
});
