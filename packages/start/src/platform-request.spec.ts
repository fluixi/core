/**
 * An entry that renders without passing `request` on, the way the scaffold wrote it, must
 * still see what middleware put on the request's locals: otherwise a signed-in visitor is
 * rendered signed out.
 */
import { describe, it, expect } from 'vitest';
import { getLocals, getRequestLocals, renderRequestAsync, renderToBodyStream } from '@fluixi/server';
import { createHandlerFrom } from './handler-core.js';

const App = () => `user:${(getLocals().auth as { user?: string } | undefined)?.user ?? 'none'}`;

const signIn = (request: Request, next: () => Promise<Response>) => {
  getRequestLocals(request).auth = { user: new URL(request.url).searchParams.get('as') };
  return next();
};

const handlerFor = (mod: object) =>
  createHandlerFrom({
    template: '<div id="root"></div>',
    mod: mod as never,
    cfg: { ssr: true, mountId: 'root' },
    middleware: { default: [signIn] },
  });

describe('middleware locals reach an entry that does not forward the request', () => {
  it('through render', async () => {
    const handler = handlerFor({ render: (url: string) => renderRequestAsync(App, { url }) });
    expect(await (await handler(new Request('http://x/dashboard?as=ada'))).text()).toContain('user:ada');
  });

  it('through renderStream', async () => {
    const handler = handlerFor({ renderStream: (url: string) => renderToBodyStream(App, { url }) });
    expect(await (await handler(new Request('http://x/dashboard?as=grace'))).text()).toContain('user:grace');
  });

  it('per request, when two render at once', async () => {
    const handler = handlerFor({
      render: async (url: string) => {
        await new Promise((r) => setTimeout(r, url.includes('slow') ? 20 : 0));
        return renderRequestAsync(App, { url });
      },
    });
    const [slow, fast] = await Promise.all([
      handler(new Request('http://x/slow?as=ada')).then((r) => r.text()),
      handler(new Request('http://x/fast?as=grace')).then((r) => r.text()),
    ]);
    expect(slow).toContain('user:ada');
    expect(fast).toContain('user:grace');
  });
});
