import { describe, it, expect } from 'vitest';
import {
  createRequestContext,
  runWithRequestContext,
  getLocals,
  getRequestLocals,
  getRequestEvent,
} from './request-context.js';

describe('request locals seam', () => {
  it('createRequestContext initializes an empty locals bag on the event', () => {
    const ctx = createRequestContext({ url: '/' });
    expect(ctx.event.locals).toEqual({});
  });

  it('preserves a locals object passed in on the event (middleware-set)', () => {
    const ctx = createRequestContext({ url: '/', locals: { auth: { user: 'ada' } } });
    expect(ctx.event.locals).toEqual({ auth: { user: 'ada' } });
  });

  it('getLocals reads/writes the current request bag inside the context', () => {
    const ctx = createRequestContext({ url: '/' });
    runWithRequestContext(ctx, () => {
      getLocals().user = { id: 'u1' };
      expect(getLocals().user).toEqual({ id: 'u1' });
      // same object as the event's locals
      expect(getRequestEvent()!.locals).toBe(getLocals());
    });
  });

  it('getLocals returns a fresh empty object off-request (never throws)', () => {
    expect(getLocals()).toEqual({});
  });

  it('adopts the request-keyed locals bag middleware wrote (middleware -> render bridge)', () => {
    const request = {} as object; // stand-in for the platform Request (WeakMap key)
    getRequestLocals(request).auth = { user: 'ada' }; // middleware writes BEFORE render
    const ctx = createRequestContext({ url: '/', request }); // app forwards `request`
    expect(ctx.event.locals).toEqual({ auth: { user: 'ada' } });
    runWithRequestContext(ctx, () => {
      expect((getLocals() as any).auth).toEqual({ user: 'ada' }); // render reads the same bag
    });
  });

  it('keeps locals isolated per request object', () => {
    const a = {} as object;
    const b = {} as object;
    getRequestLocals(a).v = 1;
    getRequestLocals(b).v = 2;
    expect(getRequestLocals(a).v).toBe(1);
    expect(getRequestLocals(b).v).toBe(2);
  });

  describe('the request start is answering', () => {
    const KEY = Symbol.for('fluixi.platformRequest');
    const registry = globalThis as Record<symbol, unknown>;
    const withAmbient = (request: object | undefined, fn: () => void) => {
      const saved = registry[KEY];
      registry[KEY] = { getStore: () => request };
      try {
        fn();
      } finally {
        registry[KEY] = saved;
      }
    };

    it('is adopted when the entry did not forward one, so middleware locals reach the render', () => {
      const request = {};
      getRequestLocals(request).auth = { user: 'ada' };
      withAmbient(request, () => {
        const ctx = createRequestContext({ url: '/dashboard' });
        expect(ctx.event.request).toBe(request);
        expect(ctx.event.locals).toEqual({ auth: { user: 'ada' } });
      });
    });

    it('does not replace one the entry forwarded', () => {
      const forwarded = {};
      getRequestLocals(forwarded).auth = { user: 'grace' };
      withAmbient({}, () => {
        expect(createRequestContext({ url: '/', request: forwarded }).event.locals).toEqual({ auth: { user: 'grace' } });
      });
    });
  });
});
