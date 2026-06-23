// @vitest-environment jsdom
/**
 * Proves the lit renderer drives real DOM with fine-grained reactive updates on the
 * TC39 signal core. @fluixi/lit's `html()` wraps reactive accessors in child positions
 * with the litrx directive, whose resolveValue() uses isSignal() to know where the
 * reactive read is. A memo that isn't isSignal-detectable would be read non-reactively
 * and freeze — so these guard the lit path AND the compat $SIGNAL marker fix.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'lit';
import { html } from './index.js';
import { createSignal, createMemo, createRoot, flush } from '@fluixi/reactive/signal';
import { $show } from '../control-flow/show.js';

describe('@fluixi/lit — reactive templates on the TC39 core', () => {
  it('a signal in child content updates the DOM', async () => {
    const host = document.createElement('div');
    await createRoot(async () => {
      const [n, setN] = createSignal(0);
      render(html`<span>${n}</span>`, host);
      expect(host.querySelector('span')?.textContent).toContain('0');
      setN(5);
      await flush();
      expect(host.querySelector('span')?.textContent).toContain('5');
    });
  });

  it('a memo in child content updates (regression: memo must be isSignal-detectable)', async () => {
    const host = document.createElement('div');
    await createRoot(async () => {
      const [n, setN] = createSignal(1);
      const doubled = createMemo(() => n() * 2);
      render(html`<b>${doubled}</b>`, host);
      expect(host.querySelector('b')?.textContent).toContain('2');
      setN(10);
      await flush();
      expect(host.querySelector('b')?.textContent).toContain('20');
    });
  });

  it('$show control-flow toggles content reactively', async () => {
    const host = document.createElement('div');
    await createRoot(async () => {
      const [on, setOn] = createSignal(false);
      render(
        html`<div>${$show({
          when: on,
          fallback: html`<p class="off">off</p>`,
          children: html`<p class="on">on</p>`,
        })}</div>`,
        host,
      );
      expect(host.querySelector('.off')).toBeTruthy();
      expect(host.querySelector('.on')).toBeNull();
      setOn(true);
      await flush();
      expect(host.querySelector('.on')).toBeTruthy();
      expect(host.querySelector('.off')).toBeNull();
    });
  });
});
