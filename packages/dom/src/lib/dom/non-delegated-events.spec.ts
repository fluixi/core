// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createNativeElement, addDelegatedEventListener, removeDelegatedEventListener } from './runtime.js';

describe('non-delegated event handlers', () => {
  it('fires focus/blur/pointerenter/pointerleave via a direct listener', () => {
    const el = createNativeElement('button') as HTMLButtonElement;
    const pe = vi.fn(), fo = vi.fn(), pl = vi.fn();
    addDelegatedEventListener(el, 'pointerenter', pe as EventListener);
    addDelegatedEventListener(el, 'focus', fo as EventListener);
    addDelegatedEventListener(el, 'pointerleave', pl as EventListener);

    el.dispatchEvent(new Event('pointerenter'));
    el.dispatchEvent(new Event('focus'));
    el.dispatchEvent(new Event('pointerleave'));

    expect(pe).toHaveBeenCalledTimes(1);
    expect(fo).toHaveBeenCalledTimes(1);
    expect(pl).toHaveBeenCalledTimes(1);
  });

  it('removes the direct listener on cleanup', () => {
    const el = createNativeElement('div') as HTMLDivElement;
    const fn = vi.fn();
    addDelegatedEventListener(el, 'mouseenter', fn as EventListener);
    removeDelegatedEventListener(el, 'mouseenter');
    el.dispatchEvent(new Event('mouseenter'));
    expect(fn).not.toHaveBeenCalled();
  });
});
