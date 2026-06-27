// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { addInterceptor, clearInterceptors, fetchWithInterceptors } from './interceptors.js';

describe('interceptors', () => {
  afterEach(() => {
    clearInterceptors();
    vi.restoreAllMocks();
  });

  it('request interceptor mutates the outgoing request', async () => {
    const seen: Record<string, string | null> = {};
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (req) => {
      seen.auth = (req as Request).headers.get('authorization');
      return new Response('ok');
    });
    addInterceptor({
      request: (r) => {
        const next = new Request(r);
        next.headers.set('authorization', 'Bearer t');
        return next;
      },
    });
    await fetchWithInterceptors('https://x/api');
    expect(seen.auth).toBe('Bearer t');
  });

  it('response interceptor transforms the result', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('raw', { status: 200 }));
    addInterceptor({ response: () => new Response('wrapped', { status: 201 }) });
    const res = await fetchWithInterceptors('https://x/api');
    expect(res.status).toBe(201);
    expect(await res.text()).toBe('wrapped');
  });

  it('error interceptor can recover with a Response', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    addInterceptor({ error: () => new Response('fallback', { status: 503 }) });
    const res = await fetchWithInterceptors('https://x/api');
    expect(res.status).toBe(503);
    expect(await res.text()).toBe('fallback');
  });

  it('rethrows when no error interceptor recovers', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    addInterceptor({ request: (r) => r });
    await expect(fetchWithInterceptors('https://x/api')).rejects.toThrow('offline');
  });
});
