// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { flush } from '@fluixi/reactive/signal';
import { hydrate, setRequestStore } from '@fluixi/dom';
import { renderToStringAsync } from '@fluixi/server';
import { SuspenseApp } from './SuspenseApp';

afterEach(() => {
  setRequestStore(null);
  delete (window as any).__FX_DATA__;
});

// Does the <Suspense> SSR-hydration duplicate happen with JSX too? Same repro as
// examples/lit-counter/src/hydrate-suspense.test.ts, authored in JSX.
// PROOF the <Suspense> SSR-hydration duplicate is a FRAMEWORK bug, not lit-specific:
// this JSX-authored twin of examples/lit-counter's SsrApp dupes identically.
// Root cause: on hydration the parent insert effect subscribes to the boundary's
// inFallback (it unwraps the Suspense output memo inline), so when the resource
// resolves it re-runs and re-instantiates the whole Suspense subtree — SuspenseImpl
// runs twice, and props.children (a fresh memo per access) builds the child twice.
// Skipped until the Suspense+hydration reconciliation is fixed.
describe('JSX <Suspense> SSR + hydrate — duplicate check', () => {
  it.skip('does not double the Suspense content on hydration', async () => {
    setRequestStore(new AsyncLocalStorage());
    const body = await renderToStringAsync(() => SuspenseApp({ url: '/' }));

    const root = document.createElement('div');
    document.body.appendChild(root);
    root.innerHTML = body.replace(/<script type="application\/json"[^>]*>[^<]*<\/script>/, '');

    hydrate(() => SuspenseApp({ url: '/' }), root);
    await new Promise((r) => setTimeout(r, 40));
    await flush();

    expect(root.querySelectorAll('.async').length).toBe(1);
    expect(root.querySelector('.async')!.textContent).toBe('User #9');
  });
});
