import { describe, it, expect } from 'vitest';
import {
  createRequestContext,
  runWithRequestContext,
  getLocals,
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
});
