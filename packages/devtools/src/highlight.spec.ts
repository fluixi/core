// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { showHighlight, hideHighlight, removeHighlight, startPicking } from './highlight.js';

const layer = () => document.getElementById('fx-highlight-layer');

let target: HTMLElement;
beforeEach(() => {
  document.body.replaceChildren();
  target = document.createElement('button');
  target.textContent = 'press';
  document.body.append(target);
});
afterEach(() => removeHighlight());

describe('the highlight', () => {
  it('puts a layer on the page the first time, and reuses it', () => {
    showHighlight(target);
    const first = layer();
    expect(first).not.toBeNull();
    showHighlight(target);
    expect(layer()).toBe(first);
  });

  it('takes no pointer events, so it cannot be what gets picked', () => {
    showHighlight(target);
    expect(layer()!.style.pointerEvents).toBe('none');
  });

  it('names the node when it is told one', () => {
    showHighlight(target, 'count');
    expect(layer()!.textContent).toBe('count');
  });

  it('hides rather than tearing down, since a pointer keeps moving', () => {
    showHighlight(target);
    hideHighlight();
    expect(layer()!.style.display).toBe('none');
    showHighlight(target);
    expect(layer()!.style.display).toBe('');
  });

  it('draws one box per region it is given', () => {
    const second = document.createElement('span');
    document.body.append(second);
    showHighlight([target, second]);
    // The label is the layer's other child.
    expect(layer()!.children.length).toBe(3);
  });

  it('hides the boxes the last one needed and this one does not', () => {
    const second = document.createElement('span');
    document.body.append(second);
    showHighlight([target, second]);
    showHighlight([target]);
    const shown = [...layer()!.children].filter(
      (c) => c !== layer()!.firstElementChild && (c as HTMLElement).style.display !== 'none',
    );
    expect(shown).toHaveLength(1);
  });

  it('lets go when everything it was given has left the page', () => {
    showHighlight(target);
    target.remove();
    showHighlight([target]);
    expect(layer()!.style.display).toBe('none');
  });

  it('builds again when the page removed it', () => {
    showHighlight(target);
    layer()!.remove();
    showHighlight(target);
    expect(layer()).not.toBeNull();
  });
});

describe('picking', () => {
  const picked: number[] = [];
  let cancelled = 0;
  const options = () => ({
    nodeAt: (el: Element | null) => (el?.tagName === 'BUTTON' ? 7 : undefined),
    describe: () => 'count',
    onPick: (id: number) => picked.push(id),
    onCancel: () => (cancelled += 1),
  });

  beforeEach(() => {
    picked.length = 0;
    cancelled = 0;
  });

  it('reports what was clicked', () => {
    startPicking(options());
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(picked).toEqual([7]);
  });

  it('keeps the click away from the application', () => {
    let pressed = 0;
    target.addEventListener('click', () => (pressed += 1));
    startPicking(options());
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    // Picking a button must not press it.
    expect(pressed).toBe(0);
    expect(picked).toEqual([7]);
  });

  it('cancels on a click the graph knows nothing about', () => {
    startPicking(options());
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(picked).toEqual([]);
    expect(cancelled).toBe(1);
  });

  it('cancels on escape', () => {
    startPicking(options());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelled).toBe(1);
  });

  it('stops after one pick', () => {
    startPicking(options());
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(picked).toEqual([7]);
  });

  it('can be stopped before anything is picked', () => {
    const stop = startPicking(options());
    stop();
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(picked).toEqual([]);
    expect(document.body.style.cursor).toBe('');
  });

  it('follows the pointer, and lets go where the graph knows nothing', () => {
    startPicking(options());
    target.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }));
    expect(layer()!.style.display).toBe('');
    document.body.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }));
    expect(layer()!.style.display).toBe('none');
  });
});

/**
 * Picking used to end at the first click. Choosing several elements in a row meant going back
 * to the toolbar between each, so the button is a mode now and this keeps it one.
 */
describe('sticky picking', () => {
  it('stays armed after a pick, and reports each one', () => {
    const picked: number[] = [];
    const host = document.createElement('div');
    host.innerHTML = '<p id="a"></p><p id="b"></p>';
    document.body.append(host);
    const stop = startPicking({
      sticky: true,
      nodeAt: (el) => (el?.id === 'a' ? 1 : el?.id === 'b' ? 2 : undefined),
      onPick: (id) => picked.push(id),
    });

    host.querySelector('#a')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    host.querySelector('#b')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(picked).toEqual([1, 2]);

    stop();
    host.querySelector('#a')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(picked).toEqual([1, 2]);
    host.remove();
  });

  it('ignores a click on nothing rather than calling it a cancel', () => {
    let cancelled = 0;
    const host = document.createElement('div');
    host.innerHTML = '<p id="c"></p>';
    document.body.append(host);
    const stop = startPicking({
      sticky: true,
      nodeAt: () => undefined,
      onPick: () => {},
      onCancel: () => cancelled++,
    });
    host.querySelector('#c')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // Still armed, so saying it ended would leave the toolbar out of step with the listeners.
    expect(cancelled).toBe(0);
    stop();
    host.remove();
  });
});
