/**
 * Focus across shadow roots, in a real browser: jsdom has no delegatesFocus and no layout.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { HTMLReactiveElement, deepActiveElement, rovingFocus, tabbables, trapFocus } from './index.js';

let n = 0;
const tag = (base: string) => `${base}-${++n}`;

const key = (target: Element, name: string, shift = false) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: name, shiftKey: shift, bubbles: true, composed: true }));

afterEach(() => {
  document.body.innerHTML = '';
});

class TextBox extends HTMLReactiveElement {
  static override shadow = { mode: 'open' as const, delegatesFocus: true };
  protected override render(): unknown {
    const input = document.createElement('input');
    input.className = 'inner';
    return input;
  }
}
const TEXT = tag('fx-text');
customElements.define(TEXT, TextBox);

describe('shadow options', () => {
  it('delegates focus from the host to the input inside', () => {
    const el = document.body.appendChild(document.createElement(TEXT));
    el.focus();
    expect(deepActiveElement()).toBe(el.shadowRoot!.querySelector('.inner'));
    expect(el.shadowRoot!.delegatesFocus).toBe(true);
  });
});

describe('tabbables', () => {
  it('walks shadow roots and slots in the order Tab would', () => {
    const wrap = document.body.appendChild(document.createElement('div'));
    wrap.innerHTML = `<button id="a">a</button><${TEXT}></${TEXT}><button id="b" disabled>b</button><span tabindex="-1">x</span><a href="#" id="c">c</a>`;
    const found = tabbables(wrap).map((el) => el.id || el.className);
    expect(found).toEqual(['a', 'inner', 'c']);
  });
});

describe('rovingFocus', () => {
  it('keeps one tab stop and moves it with the arrow keys, skipping disabled items', () => {
    const menu = document.body.appendChild(document.createElement('div'));
    menu.innerHTML = '<button>one</button><button disabled>two</button><button>three</button>';
    const items = Array.from(menu.querySelectorAll('button'));
    const moved: number[] = [];
    const dispose = createRoot((d) => {
      rovingFocus(menu, { items: () => items, onMove: (_item, i) => moved.push(i) });
      return d;
    });
    expect(items.map((b) => b.tabIndex)).toEqual([0, -1, -1]);

    items[0]!.focus();
    key(items[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[2]);
    expect(items.map((b) => b.tabIndex)).toEqual([-1, -1, 0]);
    key(items[2]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[0]);
    key(items[0]!, 'End');
    expect(document.activeElement).toBe(items[2]);
    expect(moved).toEqual([2, 0, 2]);

    dispose();
    key(items[2]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[2]);
  });
});

describe('trapFocus', () => {
  it('wraps Tab at both ends, pulls stray focus back, and restores focus on release', () => {
    const opener = document.body.appendChild(document.createElement('button'));
    const outside = document.body.appendChild(document.createElement('button'));
    const panel = document.body.appendChild(document.createElement('div'));
    panel.innerHTML = `<button id="first">first</button><${TEXT}></${TEXT}>`;
    const inner = () => (panel.querySelector(TEXT) as HTMLElement).shadowRoot!.querySelector('.inner');
    opener.focus();

    const release = trapFocus(panel);
    expect(document.activeElement?.id).toBe('first');

    // Shift+Tab from the first goes to the last, across the shadow root.
    key(panel.querySelector('#first')!, 'Tab', true);
    expect(deepActiveElement()).toBe(inner());
    // Tab from the last goes back to the first.
    key(inner()!, 'Tab');
    expect(document.activeElement?.id).toBe('first');

    outside.focus();
    expect(document.activeElement?.id).toBe('first');

    release();
    expect(document.activeElement).toBe(opener);
  });
});
