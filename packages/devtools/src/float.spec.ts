// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { makeFloatable, type Floatable } from './float.js';

let row: HTMLElement;
let pane: HTMLElement;
let sibling: HTMLElement;
let float: Floatable;

const button = () => pane.querySelector('.fx-float-btn') as HTMLButtonElement;
const card = () => document.querySelector('.fx-float') as HTMLElement | null;

beforeEach(() => {
  document.body.replaceChildren();
  row = document.createElement('div');
  pane = document.createElement('div');
  pane.id = 'timeline';
  sibling = document.createElement('div');
  // The pane sits between two others, so putting it back has somewhere exact to go.
  row.append(document.createElement('span'), pane, sibling);
  document.body.append(row);
  float = makeFloatable(pane, { title: 'timeline' });
});

describe('floating a pane', () => {
  it('adds a button to it and nothing else', () => {
    expect(button()).not.toBeNull();
    expect(card()).toBeNull();
    expect(pane.parentElement).toBe(row);
  });

  it('lifts the pane into a card', () => {
    button().click();
    expect(card()).not.toBeNull();
    expect(pane.parentElement).toBe(card());
    expect(float.floating).toBe(true);
  });

  it('moves the pane itself, so whatever drew into it still holds it', () => {
    const content = document.createElement('p');
    pane.append(content);
    button().click();
    expect(content.parentElement).toBe(pane);
    expect(pane.isConnected).toBe(true);
  });

  it('puts it back exactly where it was, not at the end', () => {
    button().click();
    button().click();
    expect(card()).toBeNull();
    expect(pane.parentElement).toBe(row);
    expect(pane.nextElementSibling).toBe(sibling);
  });

  it('says which way round it is on the button', () => {
    expect(button().textContent).toBe('⇱');
    button().click();
    expect(button().textContent).toBe('⇲');
    button().click();
    expect(button().textContent).toBe('⇱');
  });

  it('names the pane in the card', () => {
    button().click();
    expect(card()!.querySelector('.fx-float-bar')?.textContent).toBe('timeline');
  });

  it('tells the host each way round', () => {
    const seen: boolean[] = [];
    const other = document.createElement('div');
    row.append(other);
    const handle = makeFloatable(other, { title: 'tree', onChange: (f) => seen.push(f) });
    handle.toggle();
    handle.toggle();
    expect(seen).toEqual([true, false]);
  });

  it('opens each card somewhere of its own', () => {
    const other = document.createElement('div');
    row.append(other);
    makeFloatable(other, { title: 'tree' });
    button().click();
    (other.querySelector('.fx-float-btn') as HTMLElement).click();
    const [first, second] = [...document.querySelectorAll('.fx-float')] as HTMLElement[];
    expect(first!.style.left).not.toBe(second!.style.left);
  });

  it('opens where the host asked', () => {
    const other = document.createElement('div');
    row.append(other);
    const handle = makeFloatable(other, {
      title: 'tree',
      at: { x: 10, y: 20, width: 300, height: 200 },
    });
    handle.toggle();
    const opened = [...document.querySelectorAll('.fx-float')].at(-1) as HTMLElement;
    expect([opened.style.left, opened.style.top, opened.style.width]).toEqual(['10px', '20px', '300px']);
  });

  it('puts the button back when the pane rewrites itself', async () => {
    // The inspector replaces its markup on every selection, and the timeline on every commit.
    pane.innerHTML = '<p>redrawn</p>';
    expect(pane.querySelector('.fx-float-btn')).toBeNull();
    await new Promise((r) => setTimeout(r, 0));
    expect(pane.querySelector('.fx-float-btn')).not.toBeNull();
  });

  it('docks on destroy, leaving the layout as it found it', () => {
    button().click();
    float.destroy();
    expect(card()).toBeNull();
    expect(pane.parentElement).toBe(row);
    expect(pane.querySelector('.fx-float-btn')).toBeNull();
  });

  /** jsdom lays nothing out, so the card's own numbers are what there is to check. */
  const grab = (el: HTMLElement) => {
    el.setPointerCapture = () => {};
    el.hasPointerCapture = () => false;
    el.releasePointerCapture = () => {};
    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, bubbles: true }));
    return (x: number, y: number) =>
      el.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
  };
  const handle = (edge: string) => card()!.querySelector(`.fx-float-${edge}`) as HTMLElement;
  const size = () => [parseInt(card()!.style.width), parseInt(card()!.style.height)];
  const at = () => [parseInt(card()!.style.left), parseInt(card()!.style.top)];

  it('drags by the bar', () => {
    button().click();
    const [x, y] = at();
    grab(card()!.querySelector('.fx-float-bar') as HTMLElement)(40, 15);
    expect(at()).toEqual([x + 40, y + 15]);
  });

  it('resizes from every edge and corner', () => {
    button().click();
    for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      expect(handle(edge)).not.toBeNull();
    }
  });

  it('grows and shrinks from the bottom right', () => {
    button().click();
    const [w, h] = size();
    grab(handle('se'))(30, 20);
    expect(size()).toEqual([w + 30, h + 20]);
  });

  it('does not grow when a shrink has already hit the floor', () => {
    // The size used to be read back off the element, so once it clamped every further move
    // measured from the clamp and dragging inward started making the card wider.
    button().click();
    const move = grab(handle('e'));
    move(-4000, 0);
    const [floor] = size();
    move(-3900, 0);
    expect(size()[0]).toBe(floor);
  });

  it('moves the card when a left edge is dragged, and stops when the width does', () => {
    button().click();
    const [x] = at();
    const [w] = size();
    const move = grab(handle('w'));
    move(20, 0);
    expect(at()[0]).toBe(x + 20);
    expect(size()[0]).toBe(w - 20);

    // Past the floor the card must stay put rather than slide on.
    move(-20 + 4000, 0);
    const parked = at()[0];
    grab(handle('w'))(4000, 0);
    expect(at()[0]).toBe(parked);
  });

  it('keeps the card on screen, so its handles stay reachable', () => {
    button().click();
    grab(handle('se'))(9000, 9000);
    const [w, h] = size();
    const [x, y] = at();
    expect(w).toBeLessThanOrEqual(window.innerWidth);
    expect(h).toBeLessThanOrEqual(window.innerHeight);
    expect(x + w).toBeLessThanOrEqual(window.innerWidth);
    expect(y + h).toBeLessThanOrEqual(window.innerHeight);
  });

  it('leaves a button inside the bar alone, since capture would steal its click', () => {
    button().click();
    const bar = card()!.querySelector('.fx-float-bar') as HTMLElement;
    let captured = false;
    bar.setPointerCapture = () => (captured = true);
    const inner = document.createElement('button');
    bar.append(inner);
    inner.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    expect(captured).toBe(false);
  });
});
