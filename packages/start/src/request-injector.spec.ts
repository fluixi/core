/**
 * Middleware and the page behind it are one request: a root service injected in both must be
 * the same instance, and a different one for the next request. Middleware used to resolve a
 * process-wide root, so a session or unit of work injected there was shared by every visitor.
 */
import { describe, it, expect } from 'vitest';
import { inject, injectionToken, DestroyRef } from '@fluixi/di';
import { renderRequestAsync } from '@fluixi/server';
import { createHandlerFrom } from './handler-core.js';

const destroyed: number[] = [];
let made = 0;
const RequestScoped = injectionToken('RequestScoped', {
  factory: () => {
    const id = ++made;
    inject(DestroyRef).onDestroy(() => destroyed.push(id));
    return { id };
  },
});

const seen: Record<string, { middleware?: number; page?: number }> = {};
const who = (request: Request) => new URL(request.url).searchParams.get('who') ?? '?';

const App = () => `page:${inject(RequestScoped).id}`;

const handler = createHandlerFrom({
  template: '<div id="root"></div>',
  mod: {
    render: async (url: string) => {
      // Long enough for the other request to run its middleware in between.
      await new Promise((r) => setTimeout(r, url.includes('slow') ? 20 : 0));
      return renderRequestAsync(() => {
        const out = App();
        (seen[new URL(url, 'http://x').searchParams.get('who')!] ??= {}).page = inject(RequestScoped).id;
        return out;
      }, { url });
    },
  } as never,
  cfg: { ssr: true, mountId: 'root' },
  middleware: {
    default: [
      (request: Request, next: () => Promise<Response>) => {
        (seen[who(request)] ??= {}).middleware = inject(RequestScoped).id;
        return next();
      },
    ],
  },
});

describe('the root injector across middleware and the page', () => {
  it('is one instance per request, shared by middleware and the render', async () => {
    await Promise.all([handler(new Request('http://x/a?who=ada&slow')), handler(new Request('http://x/b?who=grace'))]);
    expect(seen.ada.middleware).toBe(seen.ada.page);
    expect(seen.grace.middleware).toBe(seen.grace.page);
    expect(seen.ada.middleware).not.toBe(seen.grace.middleware);
  });

  it('is disposed once the response exists', async () => {
    const before = destroyed.length;
    await handler(new Request('http://x/c?who=linus'));
    expect(destroyed.length).toBe(before + 1);
    expect(destroyed.at(-1)).toBe(seen.linus.middleware);
  });
});
