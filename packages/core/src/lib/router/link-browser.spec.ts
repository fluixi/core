// @vitest-environment jsdom
/** What <Link> leaves to the browser, as the delegated handler does. */
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@fluixi/dom';
import { ensureIntegration } from '../render/component.js';
import { Link, Router, createMemoryHistory } from './index.js';

beforeEach(() => ensureIntegration());

function mount(props: Record<string, unknown>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const history = createMemoryHistory('/start');
  render(() => Router({ routes: [{ path: '/*', component: () => Link({ children: 'go', ...props } as never) }], history } as never), container);
  const click = (init: MouseEventInit = {}) => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    container.querySelector('a')!.dispatchEvent(event);
    return event;
  };
  return { history, click };
}

describe('<Link> and the browser', () => {
  it('routes a plain click to an address of this site', async () => {
    const { history, click } = mount({ href: '/guide' });
    await Promise.resolve();
    expect(click().defaultPrevented).toBe(true);
    expect(history.get().pathname).toBe('/guide');
  });

  const left: [string, Record<string, unknown>, MouseEventInit][] = [
    ['another origin', { href: 'https://example.com/account' }, {}],
    ['target="_blank"', { href: '/guide', target: '_blank' }, {}],
    ['a download', { href: '/report.pdf', download: '' }, {}],
    ['rel="external"', { href: '/guide', rel: 'external' }, {}],
    ['a middle click', { href: '/guide' }, { button: 1 }],
    ['a modified click', { href: '/guide' }, { metaKey: true }],
  ];
  for (const [label, props, init] of left) {
    it(`leaves ${label} to the browser`, async () => {
      const { history, click } = mount(props);
      await Promise.resolve();
      expect(click(init).defaultPrevented).toBe(false);
      expect(history.get().pathname).toBe('/start');
    });
  }
});
