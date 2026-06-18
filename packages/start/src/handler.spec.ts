import { describe, it, expect } from 'vitest';
import { createRequestHandler } from './handler.js';

describe('@fluixi/start fetch handler', () => {
  it('renders a Request into an HTML Response (url = pathname+search)', async () => {
    const handler = createRequestHandler((url) => `<p>${url}</p>`);
    const res = await handler(new Request('http://x/foo?a=1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toBe('<p>/foo?a=1</p>');
  });

  it('awaits async render', async () => {
    const handler = createRequestHandler(async (url) => {
      await Promise.resolve();
      return `async:${url}`;
    });
    expect(await (await handler(new Request('http://x/p'))).text()).toBe('async:/p');
  });

  it('returns 500 with the message on render error', async () => {
    const handler = createRequestHandler(() => {
      throw new Error('boom');
    });
    const res = await handler(new Request('http://x/'));
    expect(res.status).toBe(500);
    expect(await res.text()).toContain('boom');
  });
});
