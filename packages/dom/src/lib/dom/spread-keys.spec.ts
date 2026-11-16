// @vitest-environment jsdom
/**
 * `spread`: `children` in a spread are content, never a property or an attribute; and a spread
 * source whose key set moves binds the keys that appear and clears the ones that go.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, createSignal, flush } from '@fluixi/reactive/signal';
import { createNativeElement, mergeProps, renderToString, spread } from '@fluixi/dom';
import { setServerMode } from './server/host.js';

afterEach(() => setServerMode(false));

describe('spread children', () => {
  it('inserts spread children as content in the browser', () => {
    createRoot(() => {
      const div = document.createElement('div');
      spread({ element: div, props: { label: 'x', children: 'from props' } });
      expect(div.textContent).toBe('from props');
      expect(div.hasAttribute('children')).toBe(false);
    });
  });

  it('leaves them out when the element has JSX children of its own', () => {
    createRoot(() => {
      const div = document.createElement('div');
      div.textContent = 'own child';
      spread({ element: div, props: { children: 'from props' }, skipChildren: true });
      expect(div.textContent).toBe('own child');
    });
  });

  it('renders them as content on the server, not as an attribute', () => {
    const html = renderToString(() => {
      const div = createNativeElement('div');
      const inner = createNativeElement('span');
      spread({ element: div, props: { label: 'x', children: inner } });
      return div;
    });
    expect(html).not.toContain('children=');
    expect(html).toMatch(/<div[^>]*label="x"[^>]*><span/);
  });
});

describe('spread key set', () => {
  it('binds a key the source gains, clears one it loses, and keeps the others', () => {
    createRoot(() => {
      const [attrs, setAttrs] = createSignal<Record<string, string>>({ 'data-extra': 'a' });
      const div = document.createElement('div');
      spread({ element: div, props: mergeProps(() => attrs(), {}) });
      expect(div.getAttribute('data-extra')).toBe('a');

      setAttrs({ 'data-extra': 'b', title: 'spread' });
      flush();
      expect(div.getAttribute('data-extra')).toBe('b');
      expect(div.getAttribute('title')).toBe('spread');

      setAttrs({ title: 'still' });
      flush();
      expect(div.hasAttribute('data-extra')).toBe(false);
      expect(div.getAttribute('title')).toBe('still');
    });
  });
});
