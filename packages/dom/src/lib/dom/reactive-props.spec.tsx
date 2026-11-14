// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createMemo, createSignal, createRoot } from '@fluixi/reactive/signal';
import { splitProps, spread, applyProps, createNativeElement, mergeProps } from '@fluixi/dom';

// A component prop compiles to a getter: `get value() { return sig().toUpperCase() }`
//: whose current result is a plain (non-function) value. When that prop reaches a
// native element through {...spread} or the jsx runtime, the read must happen inside
// an effect or the getter's dependency is snapshotted once and the DOM never updates.
// These guard that both prop-application paths re-read getter-backed values live.

describe('spread: getter-backed props stay reactive', () => {
  it('re-reads a getter that returns a plain value (property path)', () => {
    createRoot(() => {
      const [cur, setCur] = createSignal('usd');
      const el = createNativeElement('input') as HTMLInputElement;
      spread({ element: el, props: { get value() { return cur().toUpperCase(); } } });
      expect(el.value).toBe('USD');
      setCur('eur');
      expect(el.value).toBe('EUR');
    });
  });

  it('re-reads a getter that returns a plain value (attribute path)', () => {
    createRoot(() => {
      const [label, setLabel] = createSignal('a');
      const el = createNativeElement('div') as HTMLDivElement;
      spread({ element: el, props: { get title() { return label(); } } });
      expect(el.getAttribute('title')).toBe('a');
      setLabel('b');
      expect(el.getAttribute('title')).toBe('b');
    });
  });

  it('still reacts when the value is a function accessor', () => {
    createRoot(() => {
      const [cur, setCur] = createSignal('usd');
      const el = createNativeElement('input') as HTMLInputElement;
      spread({ element: el, props: { value: () => cur().toUpperCase() } });
      setCur('eur');
      expect(el.value).toBe('EUR');
    });
  });

  it('forwards through splitProps rest, the real component shape', () => {
    createRoot(() => {
      const [cur, setCur] = createSignal('usd');
      // parent passes a getter prop; the component splits + spreads the rest.
      const props = { variant: 'default', get value() { return cur().toUpperCase(); } };
      const [, rest] = splitProps(props, ['variant']);
      const el = createNativeElement('input') as HTMLInputElement;
      spread({ element: el, props: rest });
      expect(el.value).toBe('USD');
      setCur('eur');
      expect(el.value).toBe('EUR');
    });
  });

  it('applies a static plain value once', () => {
    createRoot(() => {
      const el = createNativeElement('input') as HTMLInputElement;
      spread({ element: el, props: { value: 'fixed', type: 'text' } });
      expect(el.value).toBe('fixed');
      expect(el.getAttribute('type')).toBe('text');
    });
  });
});

describe('applyProps: getter-backed props stay reactive', () => {
  const build = (props: Record<string, any>): HTMLInputElement => {
    const el = document.createElement('input');
    applyProps(el, props);
    return el;
  };

  it('value (getter -> plain string)', () => {
    createRoot(() => {
      const [cur, setCur] = createSignal('usd');
      const el = build({ get value() { return cur().toUpperCase(); } });
      expect(el.value).toBe('USD');
      setCur('eur');
      expect(el.value).toBe('EUR');
    });
  });

  it('checked (getter -> plain bool)', () => {
    createRoot(() => {
      const [on, setOn] = createSignal(false);
      const el = build({ type: 'checkbox', get checked() { return on(); } });
      expect(el.checked).toBe(false);
      setOn(true);
      expect(el.checked).toBe(true);
    });
  });

  it('generic attribute (getter -> plain string)', () => {
    createRoot(() => {
      const [label, setLabel] = createSignal('a');
      const el = build({ get title() { return label(); } });
      expect(el.getAttribute('title')).toBe('a');
      setLabel('b');
      expect(el.getAttribute('title')).toBe('b');
    });
  });

  it('does not fight the user: no value write while the input is focused', () => {
    createRoot(() => {
      const [cur, setCur] = createSignal('usd');
      const el = build({ get value() { return cur().toUpperCase(); } });
      document.body.appendChild(el);
      el.focus();
      setCur('eur'); // update arrives while focused, must be ignored
      expect(el.value).toBe('USD');
      el.remove();
    });
  });
});

describe('spread inside a computation that builds the element', () => {
  // `Show` and `For` build their children in a memo. What a spread reads while it sets the
  // element up belongs to the spread's own bindings, not to that memo, or the memo rebuilt the
  // element on every change.
  it('updates the attribute without re-running the memo that created the element', () => {
    createRoot(() => {
      const [count, setCount] = createSignal(1);
      let builds = 0;
      const view = createMemo(() => {
        builds += 1;
        const el = createNativeElement('x-picker') as HTMLElement;
        spread({ element: el, props: mergeProps(() => ({ 'data-count': String(count()) })), isCustomElement: true });
        return el;
      });
      expect(view().getAttribute('data-count')).toBe('1');
      setCount(2);
      expect(view().getAttribute('data-count')).toBe('2');
      expect(builds).toBe(1);
    });
  });
});

