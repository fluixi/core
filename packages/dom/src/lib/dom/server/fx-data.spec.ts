// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { escapeFxJson, getServerData, resetServerDataCache, FX_DATA_ID } from './fx-data.js';

describe('__FX_DATA__ transport (escaping + reader)', () => {
  afterEach(() => {
    delete (globalThis as any).__FX_DATA__;
    document.getElementById(FX_DATA_ID)?.remove();
    resetServerDataCache();
  });

  it('escapes the standard SSR-JSON set so a value cannot break out of <script>', () => {
    const raw = '</script><!-- a & b \u2028\u2029';
    const out = escapeFxJson(JSON.stringify({ x: raw }));
    // No raw breakout / line-terminator characters survive...
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<!--');
    expect(out).not.toMatch(/[<>&\u2028\u2029]/);
    // ...and it still round-trips back to the original value via JSON.parse.
    expect(JSON.parse(out)).toEqual({ x: raw });
  });

  it('getServerData parses the non-executable JSON <script> block', () => {
    const payload = { r0: { domain: 'leuzma.com' }, '__i18n:locale': 'fr' };
    const el = document.createElement('script');
    el.type = 'application/json';
    el.id = FX_DATA_ID;
    el.textContent = escapeFxJson(JSON.stringify(payload));
    document.body.appendChild(el);
    expect(getServerData()).toEqual(payload);
  });

  it('prefers a pre-set global over the script block (back-compat)', () => {
    (globalThis as any).__FX_DATA__ = { fromGlobal: true };
    expect(getServerData()).toEqual({ fromGlobal: true });
  });

  it('reads the script when the global is the script element itself (named access on window)', () => {
    const payload = { '__i18n:locale': 'en' };
    const el = document.createElement('script');
    el.type = 'application/json';
    el.id = FX_DATA_ID;
    el.textContent = escapeFxJson(JSON.stringify(payload));
    document.body.appendChild(el);
    // What a browser does for an element with an id: window.__FX_DATA__ is the element.
    (globalThis as any).__FX_DATA__ = el;
    expect(getServerData()).toEqual(payload);
  });

  it('returns null when the page was not server-rendered', () => {
    expect(getServerData()).toBeNull();
  });
});
