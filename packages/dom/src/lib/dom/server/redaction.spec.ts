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

/**
 * A resource can resolve to something JSON cannot carry: most often a lazy
 * route's module, where the resource value is the component function. That entry
 * used to reach `JSON.stringify`, which drops the key without a word, so the
 * document shipped `<script id="__FX_DATA__">{}</script>`: a transport with
 * nothing in it, on every page whose only resource was a lazy import.
 */
describe('__FX_DATA__ is omitted when it would carry nothing', () => {
  afterEach(() => setDataRedactor(null));

  it('drops a function value instead of emitting an empty payload', () => {
    expect(serializeResourceData(ctxWith({ r0: () => 'a lazy module' }))).toBe('');
  });

  it('drops a symbol value', () => {
    expect(serializeResourceData(ctxWith({ r0: Symbol('x') }))).toBe('');
  });

  it('still emits the entries that do serialize, alongside one that does not', () => {
    const out = serializeResourceData(ctxWith({ r0: () => {}, r1: { name: 'Ada' } }));
    expect(out).toContain('Ada');
    expect(out).not.toContain('r0');
  });

  it('omits the script when every value is redacted away', () => {
    setDataRedactor(() => undefined);
    expect(serializeResourceData(ctxWith({ r0: { name: 'Ada' } }))).toBe('');
  });

  it('keeps emitting a payload that has real data', () => {
    expect(serializeResourceData(ctxWith({ r0: { name: 'Ada' } }))).toContain('Ada');
  });
});
