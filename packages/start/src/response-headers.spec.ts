import { describe, it, expect } from 'vitest';
import { appendResponseHeader, createRequestContext, runWithRequestContext } from '@fluixi/dom';
import { createHandlerFrom } from './handler-core.js';

const template = '<html><body><div id="root"></div></body></html>';

describe('headers set while answering a request', () => {
  it('reach the page response, and the middleware sees them', async () => {
    let seen: string[] = [];
    const mod = {
      render: async () => {
        appendResponseHeader('set-cookie', 'ui%3Atheme=dark; Path=/');
        appendResponseHeader('set-cookie', 'b=2; Path=/');
        return '<p>page</p>';
      },
      __fluixiAppMiddleware: [
        async (_request: Request, next: () => Promise<Response>) => {
          const response = await next();
          seen = response.headers.getSetCookie();
          return response;
        },
      ],
    };
    const handler = createHandlerFrom({ template, mod: mod as never, cfg: { ssr: true, mountId: 'root' } });
    const response = await handler(new Request('http://localhost/'));
    expect(response.headers.getSetCookie()).toEqual(['ui%3Atheme=dark; Path=/', 'b=2; Path=/']);
    expect(seen).toHaveLength(2);
  });

  it('reach a response whose headers are immutable', async () => {
    const mod = {
      isApiRequest: () => true,
      // As the generated API dispatcher does: the route runs inside a request context.
      handleApiRequest: async (request: Request) =>
        runWithRequestContext(createRequestContext({ request }), () => {
          appendResponseHeader('set-cookie', 'a=1');
          return Response.redirect('http://localhost/next', 302);
        }),
    };
    const handler = createHandlerFrom({ template, mod: mod as never, cfg: { ssr: true, mountId: 'root' } });
    const response = await handler(new Request('http://localhost/api/x'));
    expect(response.status).toBe(302);
    expect(response.headers.getSetCookie()).toEqual(['a=1']);
  });
});
