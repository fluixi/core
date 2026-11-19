/**
 * Hot reload: a tag defined again swaps the setup its class reads and rebuilds the instances on
 * the page, keeping their props. The registry is the one `@fluixi/dom/hot` creates in dev.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { defineElement, prop } from './index.js';

const KEY = Symbol.for('fluixi.hot');
const host = globalThis as Record<symbol, unknown>;

beforeAll(() => {
  host[KEY] = { elements: new Map() };
});
afterAll(() => {
  delete host[KEY];
  document.body.innerHTML = '';
});

const setup = (word: string) => ({ el, props }: { el: HTMLElement; props: { name: () => unknown } }) => {
  el.textContent = `${word} ${String(props.name())}`;
  return null;
};

describe('a custom element under hot reload', () => {
  it('rebuilds its instances with the new setup, keeping their props', () => {
    const First = defineElement('fx-hot-card', setup('hello') as never, { props: { name: prop.string() } as never });
    const card = document.createElement('fx-hot-card') as HTMLElement & { name: string };
    card.name = 'Ada';
    document.body.append(card);
    expect(card.textContent).toBe('hello Ada');

    const Second = defineElement('fx-hot-card', setup('bonjour') as never, { props: { name: prop.string() } as never });
    expect(Second).toBe(First);
    expect(card.textContent).toBe('bonjour Ada');
  });

  it('runs the rebuild under the registry announce, outlining the live instances', () => {
    const calls: string[] = [];
    const registry = host[KEY] as { announce?: unknown };
    registry.announce = (label: string, swap: () => void, rebuilt?: () => Element[]) => {
      calls.push(`before ${label}`);
      swap();
      calls.push(`after ${rebuilt?.().length}`);
    };
    defineElement('fx-hot-badge', setup('a') as never, { props: { name: prop.string() } as never });
    const badge = document.createElement('fx-hot-badge') as HTMLElement & { name: string };
    badge.name = 'Bo';
    document.body.append(badge);

    defineElement('fx-hot-badge', setup('b') as never, { props: { name: prop.string() } as never });
    expect(calls).toEqual(['before hot update: <fx-hot-badge>', 'after 1']);
    expect(badge.textContent).toBe('b Bo');

    // A third version: the element is rebuilt once, not once per earlier build.
    let builds = 0;
    defineElement('fx-hot-badge', ((ctx: never) => (builds++, setup('c')(ctx))) as never, { props: { name: prop.string() } as never });
    expect(builds).toBe(1);
    delete registry.announce;
  });
});
