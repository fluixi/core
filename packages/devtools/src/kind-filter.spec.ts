// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createKindFilter, FILTERABLE_KINDS, KIND_FILTER_CSS, type KindFilter } from './kind-filter.js';
import type { NodeKind } from './instrument.js';

let host: HTMLElement;
let filter: KindFilter;
let reported: (NodeKind[] | null)[];

const build = (): KindFilter =>
  createKindFilter(host, { onChange: (kinds) => reported.push(kinds) });

const button = () => host.querySelector('.fx-kinds-button') as HTMLButtonElement;
const panel = () => host.querySelector('.fx-kinds-panel') as HTMLElement;
const all = () => host.querySelector('.fx-kinds-all input') as HTMLInputElement;
const boxes = () => [...host.querySelectorAll('.fx-kinds-panel label:not(.fx-kinds-all) input')] as HTMLInputElement[];

/** Clicking a checkbox: the state flips first, then the event fires. */
const toggle = (box: HTMLInputElement): void => {
  box.checked = !box.checked;
  box.dispatchEvent(new Event('change'));
};

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  reported = [];
  filter = build();
});

afterEach(() => {
  filter.destroy();
  host.remove();
});

describe('the kind filter', () => {
  it('offers every kind, on to begin with', () => {
    expect(boxes()).toHaveLength(FILTERABLE_KINDS.length);
    expect(boxes().every((b) => b.checked)).toBe(true);
    expect(filter.selected).toEqual([...FILTERABLE_KINDS]);
  });

  it('says nothing until something is turned off', () => {
    expect(reported).toEqual([]);
    expect(button().textContent).toBe('Kinds');
  });

  it('reports null when everything is on, rather than a set of everything', () => {
    // Null rather than a full set, so kinds without a checkbox still draw.
    const first = boxes()[0]!;
    toggle(first);
    toggle(first);
    expect(reported.at(-1)).toBeNull();
  });

  it('reports what is left when one is turned off', () => {
    toggle(boxes()[0]!);
    expect(reported.at(-1)).toEqual(FILTERABLE_KINDS.slice(1));
  });

  it('counts on the button once it is filtering', () => {
    toggle(boxes()[0]!);
    expect(button().textContent).toBe(`Kinds · ${FILTERABLE_KINDS.length - 1}`);
    expect(button().classList.contains('on')).toBe(true);
  });

  it('shows the all box as neither when some are off', () => {
    toggle(boxes()[0]!);
    expect(all().checked).toBe(false);
    expect(all().indeterminate).toBe(true);
  });

  it('turns everything back on from the all box', () => {
    toggle(boxes()[0]!);
    toggle(boxes()[1]!);
    all().dispatchEvent(new Event('change'));
    expect(filter.selected).toEqual([...FILTERABLE_KINDS]);
    expect(reported.at(-1)).toBeNull();
  });

  it('never leaves the graph with nothing in it', () => {
    // Unticking `all` would select nothing, which leaves an empty graph.
    for (const box of boxes()) toggle(box);
    all().checked = false;
    all().dispatchEvent(new Event('change'));
    expect(filter.selected).toEqual([...FILTERABLE_KINDS]);
  });

  it('hides the panel in the stylesheet as well as the markup', () => {
    // The panel sets `display`, which outranks the user agent's rule for `hidden`, so
    // without this the panel stays on screen however the attribute is set.
    expect(KIND_FILTER_CSS).toContain('.fx-kinds-panel[hidden]');
  });

  it('opens and shuts', () => {
    expect(panel().hidden).toBe(true);
    button().click();
    expect(panel().hidden).toBe(false);
    expect(button().getAttribute('aria-expanded')).toBe('true');
    button().click();
    expect(panel().hidden).toBe(true);
  });

  it('shuts on a click outside, and stays open on one inside', () => {
    button().click();
    panel().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(panel().hidden).toBe(false);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(panel().hidden).toBe(true);
  });

  it('shuts on escape', () => {
    button().click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(panel().hidden).toBe(true);
  });

  it('takes a selection from the host without reporting it back', () => {
    filter.select(['state', 'memo']);
    expect(filter.selected).toEqual(['state', 'memo']);
    expect(boxes().filter((b) => b.checked)).toHaveLength(2);
    expect(reported).toEqual([]);
  });

  it('lets go of the document when destroyed', () => {
    button().click();
    filter.destroy();
    // Removed from the host, and the escape handler is gone.
    expect(host.querySelector('.fx-kinds')).toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  });
});
