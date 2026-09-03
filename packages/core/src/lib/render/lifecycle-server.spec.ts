// No jsdom here on purpose: the absence of `window` is the condition under test.
import { describe, it, expect } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';

describe('lifecycle on the server', () => {
  it('does not run an onMount callback', async () => {
    const { onMount } = await import('./component.js');
    let ran = false;

    createRoot(() => {
      onMount(() => {
        ran = true;
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ran).toBe(false);
  });

  it('does not run one passed the synchronous form either', async () => {
    const { onMount } = await import('./component.js');
    let ran = false;

    createRoot(() => {
      onMount(() => {
        ran = true;
      }, false);
    });

    expect(ran).toBe(false);
  });

  it('does not run a useEffect callback', async () => {
    const { useEffect } = await import('./component.js');
    let ran = false;

    createRoot(() => {
      useEffect(() => {
        ran = true;
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ran).toBe(false);
  });
});
