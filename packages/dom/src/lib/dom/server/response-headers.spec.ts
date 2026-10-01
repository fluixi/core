import { describe, it, expect } from 'vitest';
import { appendResponseHeader, takeResponseHeaders, createRequestContext, runWithRequestContext } from '@fluixi/dom';

describe('appendResponseHeader', () => {
  it('collects headers for the request being rendered', () => {
    const request = new Request('http://x.test/');
    const ctx = createRequestContext({ request });
    runWithRequestContext(ctx, () => {
      expect(appendResponseHeader('set-cookie', 'a=1')).toBe(true);
      expect(appendResponseHeader('set-cookie', 'b=2')).toBe(true);
    });
    expect(takeResponseHeaders(request)?.getSetCookie()).toEqual(['a=1', 'b=2']);
  });

  it('reports a write after the headers were taken, and one outside a request', () => {
    const request = new Request('http://x.test/');
    const ctx = createRequestContext({ request });
    takeResponseHeaders(request);
    expect(runWithRequestContext(ctx, () => appendResponseHeader('set-cookie', 'late=1'))).toBe(false);
    expect(appendResponseHeader('set-cookie', 'none=1')).toBe(false);
  });

  it('keeps concurrent requests apart', () => {
    const one = new Request('http://x.test/1');
    const two = new Request('http://x.test/2');
    runWithRequestContext(createRequestContext({ request: one }), () => appendResponseHeader('x-a', '1'));
    runWithRequestContext(createRequestContext({ request: two }), () => appendResponseHeader('x-b', '2'));
    expect(takeResponseHeaders(one)?.get('x-b')).toBeNull();
    expect(takeResponseHeaders(two)?.get('x-b')).toBe('2');
  });
});
