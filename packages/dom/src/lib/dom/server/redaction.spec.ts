import { describe, it, expect, afterEach } from 'vitest';
import { createRequestContext, serializeResourceData, setDataRedactor } from './index.js';

function ctxWith(data: Record<string, unknown>) {
  const ctx = createRequestContext();
  for (const [k, v] of Object.entries(data)) ctx.data.set(k, v);
  return ctx;
}

describe('__FX_DATA__ redaction', () => {
  afterEach(() => setDataRedactor(null));

  it('serializes all data when no redactor is set', () => {
    const out = serializeResourceData(ctxWith({ a: { name: 'Ada', token: 'secret' } }));
    expect(out).toContain('Ada');
    expect(out).toContain('secret');
  });

  it('strips fields the redactor removes', () => {
    setDataRedactor((v: any) => {
      if (v && typeof v === 'object' && 'token' in v) { const { token, ...safe } = v; return safe; }
      return v;
    });
    const out = serializeResourceData(ctxWith({ a: { name: 'Ada', token: 'secret' } }));
    expect(out).toContain('Ada');
    expect(out).not.toContain('secret');
  });

  it('omits an entry when the redactor returns undefined', () => {
    setDataRedactor((_v, id) => (id === 'secret-res' ? undefined : _v));
    const out = serializeResourceData(ctxWith({ pub: 1, 'secret-res': { k: 'v' } }));
    expect(out).toContain('pub');
    expect(out).not.toContain('secret-res');
  });

  it('omits (does not leak) when the redactor throws', () => {
    setDataRedactor(() => { throw new Error('boom'); });
    expect(serializeResourceData(ctxWith({ a: 'x' }))).toBe('');
  });
});
