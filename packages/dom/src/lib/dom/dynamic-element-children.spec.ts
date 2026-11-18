// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { createDynamicElement } from './dynamic-element.js';
import { applyProps, createNativeElement, splitProps } from './runtime.js';

/** Children as the compiler passes them: a getter that builds the subtree on each read. */
function lazyChildren(count: { n: number }) {
  return {
    'data-x': '',
    get children() {
      count.n++;
      return document.createElement('span');
    },
  };
}

describe('children are built once', () => {
  it('createDynamicElement reads a children getter once', () => {
    const count = { n: 0 };
    const el = createRoot(() => createDynamicElement('div', lazyChildren(count))) as HTMLElement;
    expect(count.n).toBe(1);
    expect(el.querySelectorAll('span')).toHaveLength(1);
  });

  it('through splitProps, as Polymorphic passes them', () => {
    const count = { n: 0 };
    createRoot(() => {
      const [, others] = splitProps(lazyChildren(count), ['as' as never]);
      createDynamicElement('div', others);
    });
    expect(count.n).toBe(1);
  });

  it('applyProps leaves children unread', () => {
    const count = { n: 0 };
    createRoot(() => applyProps(createNativeElement('div'), lazyChildren(count)));
    expect(count.n).toBe(0);
  });

  it('a plain children: undefined inserts nothing', () => {
    const el = createRoot(() => createDynamicElement('div', { children: undefined })) as HTMLElement;
    expect(el.childNodes).toHaveLength(0);
  });
});
