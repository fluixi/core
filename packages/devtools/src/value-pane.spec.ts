// @vitest-environment jsdom
//
// A value wider than a line was only ever read as its first clause. This is the whole of it.
import { describe, it, expect, beforeEach } from 'vitest';
import { createValuePane } from './value-pane.js';
import { createInspector } from './inspector.js';
import { registerDevtoolsPlugin } from './plugin.js';
import type { RNode } from './instrument.js';

let host: HTMLElement;
beforeEach(() => {
  host = document.createElement('div');
  document.body.replaceChildren(host);
});

// The card is appended to the body, the way every floated pane is.
const pane = () => document.querySelector('.vp-body');

const long = `{router: {state: ƒ state(), subscribe: ƒ subscribe(), navigate: ƒ navigate(), match: ƒ match(), destroy: ƒ destroy()}, location: ƒ read(), params: {}, depth: 0}`;

describe('the value pane', () => {
  it('shows the whole value, across lines, with nothing cut', () => {
    const view = createValuePane(host);
    view.open('router', long);
    const body = document.querySelector('.vp-body')!.textContent!;
    expect(body).toContain('destroy');
    expect(body).not.toContain('…');
    expect(body.split('\n').length).toBeGreaterThan(3);
  });

  it('closes on its button and on escape', () => {
    const view = createValuePane(host);
    view.open('x', long);
    (document.querySelector('.vp-close') as HTMLElement).click();
    expect(view.isOpen).toBe(false);

    view.open('x', long);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(view.isOpen).toBe(false);
  });

  it('moves and resizes like the other panes', () => {
    const view = createValuePane(host);
    view.open('router', long);
    const card = document.querySelector('.fx-float') as HTMLElement;
    expect(card).not.toBeNull();
    // A bar to drag by, and a handle on every edge and corner.
    expect(card.querySelector('.fx-float-bar')).not.toBeNull();
    expect(card.querySelectorAll('.fx-float-h')).toHaveLength(8);
    view.close();
  });
});

describe('the inspector opens it', () => {
  const graph = (): Map<number, RNode> =>
    new Map<number, RNode>([
      [
        1,
        {
          id: 1,
          label: 'router',
          kind: 'context',
          deps: new Set(),
          writes: new Set(),
          runs: 0,
          lastPulse: 0,
          value: '{router: {…',
          detail: long,
        },
      ],
    ]);

  it('marks a value that was cut and shows all of it when clicked', () => {
    registerDevtoolsPlugin({ name: 'none' });
    createInspector(host).show(graph(), 1);
    const cell = host.querySelector('.ins-val.ins-more') as HTMLElement;
    expect(cell).not.toBeNull();
    cell.click();
    expect(document.querySelector('.vp-body')!.textContent).toContain('destroy');
  });

  it('leaves a value that fits alone', () => {
    const small = graph();
    small.get(1)!.detail = '"fr"';
    small.get(1)!.value = '"fr"';
    createInspector(host).show(small, 1);
    expect(host.querySelector('.ins-more')).toBeNull();
  });
});
