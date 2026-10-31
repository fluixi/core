import { describe, it, expect, vi } from 'vitest';
import { createHandlerFrom } from './handler-core.js';
import { guardHandler } from './document.js';

const TEMPLATE = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';
const failing = {
  render: () => {
    throw new Error('token request timed out at secret.internal');
  },
};
const page = (accept: string) => new Request('https://app.example/orders', { headers: { accept } });

describe('a failed request in production', () => {
  it('logs the error and answers with a page that shows nothing of it', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createHandlerFrom({ template: TEMPLATE, mod: failing as never, cfg: { ssr: true, mountId: 'root' } });
    const response = await handler(page('text/html'));
    const body = await response.text();
    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(body).not.toContain('secret.internal');
    expect(body).not.toContain('at ');
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("serves the app's own page when it has one", async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createHandlerFrom({
      template: TEMPLATE,
      mod: failing as never,
      cfg: { ssr: true, mountId: 'root' },
      errorPage: '<!doctype html><title>Oops</title><h1>Acme is down</h1>',
    });
    expect(await (await handler(page('text/html'))).text()).toContain('Acme is down');
    log.mockRestore();
  });

  it('answers a request for data with a short text, still without the stack', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const middleware = { default: () => { throw new Error('db password=hunter2'); } };
    const handler = createHandlerFrom({ template: TEMPLATE, mod: {} as never, cfg: { ssr: true, mountId: 'root' }, middleware });
    const response = await handler(page('application/json'));
    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Internal Server Error');
    log.mockRestore();
  });
});

describe('a failed request in development', () => {
  it('keeps the stack, for the developer', async () => {
    const handler = guardHandler(async () => {
      throw new Error('broken loader');
    });
    expect(await (await handler(page('text/html'))).text()).toContain('broken loader');
  });
});
