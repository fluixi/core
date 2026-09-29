/**
 * An API-only app: the API routes answer, nothing renders, and what no route claims is a JSON 404.
 */
import { describe, it, expect } from 'vitest';
import { createHandlerFrom } from './handler-core.js';
import { resolveConfig } from './config.js';

const api = {
  isApiRequest: (request: Request) => new URL(request.url).pathname.startsWith('/api/'),
  handleApiRequest: async () => new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }),
};

describe('an API-only app', () => {
  it('is off unless asked for', () => {
    expect(resolveConfig({}).apiOnly).toBe(false);
    expect(resolveConfig({ apiOnly: true }).apiOnly).toBe(true);
  });

  it('answers API routes and nothing else, in JSON, with no template', async () => {
    const handler = createHandlerFrom({ template: '', mod: api as never, cfg: { ssr: true, mountId: 'root', apiOnly: true } });
    const ok = await handler(new Request('http://localhost/api/v1/ping'));
    expect(await ok.json()).toEqual({ ok: true });

    const missing = await handler(new Request('http://localhost/projects', { method: 'POST' }));
    expect(missing.status).toBe(404);
    expect(missing.headers.get('content-type')).toContain('application/json');
    expect(await missing.json()).toEqual({ error: { code: 'not_found', message: 'No route for POST /projects.' } });
  });

  it('still runs the app middleware around the routes', async () => {
    const seen: string[] = [];
    const mod = {
      ...api,
      __fluixiAppMiddleware: [
        async (request: Request, next: (r: Request) => Promise<Response>) => {
          seen.push(new URL(request.url).pathname);
          return next(request);
        },
      ],
    };
    const handler = createHandlerFrom({ template: '', mod: mod as never, cfg: { ssr: true, mountId: 'root', apiOnly: true } });
    await handler(new Request('http://localhost/api/v1/ping'));
    await handler(new Request('http://localhost/nowhere'));
    expect(seen).toEqual(['/api/v1/ping', '/nowhere']);
  });
});

describe('API route path templates', () => {
  it('turns file paths into the path templates an API description uses', async () => {
    const { pathTemplate } = await import('./api.js');
    expect(pathTemplate('v1/projects/index')).toBe('/api/v1/projects');
    expect(pathTemplate('v1/projects/[id]')).toBe('/api/v1/projects/{id}');
    expect(pathTemplate('files/[...path]')).toBe('/api/files/{path}');
    expect(pathTemplate('openapi.json')).toBe('/api/openapi.json');
    expect(pathTemplate('index')).toBe('/api');
  });
});
