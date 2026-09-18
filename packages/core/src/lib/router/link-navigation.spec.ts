// @vitest-environment jsdom
/**
 * `useLinkNavigation`: client-side navigation for anchors the app didn't author, the
 * markdown/CMS `innerHTML` case where there is no <Link> to render.
 *
 * The point of the guards is that the element stays a real anchor: everything a user or a
 * crawler can do with it still works, and only a plain left-click is taken over.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, createNativeElement, insert } from '@fluixi/dom';
import { ensureIntegration } from '../render/component.js';
import { Router, createMemoryHistory, useLinkNavigation } from './index.js';

beforeEach(() => ensureIntegration());

/** Mount a router whose page is a container of raw HTML wired to the interceptor. */
function mount(html: string, options?: Parameters<typeof useLinkNavigation>[0]) {
  const history = createMemoryHistory('/start');
  const container = document.createElement('div');
  document.body.appendChild(container);

  let content!: HTMLElement;
  const Page = () => {
    const onClick = useLinkNavigation(options);
    content = createNativeElement('div') as any;
    content.innerHTML = html;
    content.addEventListener('click', onClick as any);
    return content;
  };
  const Other = () => {
    const e = createNativeElement('div');
    insert(e, 'ELSEWHERE');
    return e;
  };

  render(
    () =>
      Router({
        routes: [
          { path: '/start', component: Page },
          { path: '/guide', component: Other },
          { path: '*', component: Other },
        ],
        history,
      }),
    container,
  );

  const click = (selector: string, init: MouseEventInit = {}) => {
    const a = content.querySelector(selector) as HTMLAnchorElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    a.dispatchEvent(event);
    return event;
  };

  return { history, click, container };
}

describe('useLinkNavigation', () => {
  it('navigates on a plain left-click, without leaving the document', () => {
    const { history, click } = mount('<p><a class="in" href="/guide">Guide</a></p>');
    const event = click('.in');

    expect(event.defaultPrevented).toBe(true);
    expect(history.get().pathname).toBe('/guide');
  });

  it('resolves a relative href against the current document', () => {
    // Prerendered markdown links read `./guide`, not an absolute path.
    const { history, click } = mount('<a class="rel" href="./guide">Guide</a>');
    click('.rel');

    expect(history.get().pathname).toBe('/guide');
  });

  it('carries the query and hash of the target page', () => {
    const { history, click } = mount('<a class="q" href="/guide?tab=api#usage">Guide</a>');
    click('.q');

    const loc = history.get();
    expect(loc.pathname).toBe('/guide');
    expect(loc.search).toBe('?tab=api');
    expect(loc.hash).toBe('#usage');
  });

  it('works for a click on something nested inside the anchor', () => {
    const { history, click } = mount('<a class="deep" href="/guide"><span><code>x</code></span></a>');
    const a = document.querySelector('.deep code') as HTMLElement;
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));

    expect(history.get().pathname).toBe('/guide');
  });

  it('replaces the entry when asked', () => {
    const { history, click } = mount('<a class="in" href="/guide">Guide</a>', { replace: true });
    click('.in');

    expect(history.get().pathname).toBe('/guide');
  });

  it('honours shouldNavigate opting a link out', () => {
    const seen: string[] = [];
    const { history, click } = mount('<a class="in" href="/guide">Guide</a>', {
      shouldNavigate: (url) => (seen.push(url.pathname), false),
    });
    const event = click('.in');

    expect(seen).toEqual(['/guide']);
    expect(event.defaultPrevented).toBe(false);
    expect(history.get().pathname).toBe('/start');
  });
});

describe('what it deliberately leaves to the browser', () => {
  const cases: [string, string, MouseEventInit][] = [
    ['a modified click (open in new tab)', '<a class="t" href="/guide">g</a>', { metaKey: true }],
    ['a middle click', '<a class="t" href="/guide">g</a>', { button: 1 }],
    ['target="_blank"', '<a class="t" href="/guide" target="_blank">g</a>', {}],
    ['a download', '<a class="t" href="/guide" download>g</a>', {}],
    ['rel="external"', '<a class="t" href="/guide" rel="noopener external">g</a>', {}],
    ['another origin', '<a class="t" href="https://example.com/guide">g</a>', {}],
    ['a mailto: link', '<a class="t" href="mailto:x@example.com">g</a>', {}],
    ['a tel: link', '<a class="t" href="tel:+15551234">g</a>', {}],
    ['an in-page hash', '<a class="t" href="#section">g</a>', {}],
    ['an anchor with no href', '<a class="t">g</a>', {}],
  ];

  for (const [label, html, init] of cases) {
    it(`leaves ${label} alone`, () => {
      const { history, click } = mount(html, {});
      const event = click('.t', init);

      expect(event.defaultPrevented).toBe(false);
      expect(history.get().pathname).toBe('/start');
    });
  }

  it('leaves an event another handler already prevented', () => {
    const { history, click } = mount('<a class="t" href="/guide">g</a>');
    document.addEventListener('click', (e) => e.preventDefault(), { capture: true, once: true });
    click('.t');

    expect(history.get().pathname).toBe('/start');
  });
});
