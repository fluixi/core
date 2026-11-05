// @vitest-environment jsdom
/**
 * The server's data belongs to the address it rendered. A page reached after hydration (a
 * redirect while the first page hydrates) must fetch its own data, not take another page's by
 * creation order: the workspace layout's `null` once became the organisation list's.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { ensureIntegration } from './render/component.js';

beforeAll(() => ensureIntegration());
afterEach(() => {
  delete (globalThis as { __FX_DATA__?: unknown }).__FX_DATA__;
  history.replaceState(null, '', '/');
});

function hydrateAt(path: string, data: Record<string, unknown>) {
  history.replaceState(null, '', path);
  (globalThis as { __FX_DATA__?: unknown }).__FX_DATA__ = data;
  const container = document.createElement('div');
  DOM.hydrate(() => null, container);
}

describe('server data after hydration', () => {
  it('still seeds a resource made later on the address the server rendered', async () => {
    hydrateAt('/app', { r0: 'from the server' });
    let fetched = 0;
    const [value] = S.createResource(async () => {
      fetched++;
      return 'fetched';
    });
    await S.flush();
    expect(value()).toBe('from the server');
    expect(fetched).toBe(0);
  });

  it('is not handed to a page on another address', async () => {
    hydrateAt('/app', { r0: null });
    history.pushState(null, '', '/organisations');
    const [value] = S.createResource(async () => ['Agence QA']);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(value()).toEqual(['Agence QA']);
  });
});
