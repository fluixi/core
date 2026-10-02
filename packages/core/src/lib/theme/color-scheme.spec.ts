// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { createColorScheme } from './color-scheme.js';
import { ColorSchemeProvider, ThemeProvider, useColorScheme, useTheme } from './provider.js';

let osDark = false;
const listeners = new Set<() => void>();
const flipOs = (dark: boolean) => {
  osDark = dark;
  listeners.forEach((l) => l());
};

beforeEach(() => {
  document.cookie = 'color-scheme=; Max-Age=0; Path=/';
  document.documentElement.removeAttribute('data-theme');
  listeners.clear();
  osDark = false;
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query.includes('dark') && osDark;
    },
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  }));
});

describe('createColorScheme', () => {
  it('follows the OS until a choice, then keeps the choice', () =>
    createRoot((dispose) => {
      osDark = true;
      const scheme = createColorScheme();
      expect(scheme.value()).toBe('system');
      expect(scheme.resolved()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      flipOs(false);
      expect(scheme.resolved()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      scheme.toggle(); // from what is shown: light
      expect(scheme.value()).toBe('dark');
      expect(document.cookie).toContain('color-scheme=');
      flipOs(false);
      expect(scheme.resolved()).toBe('dark');
      dispose();
    }));

  it('writes system while following the OS with systemAs: system', () =>
    createRoot((dispose) => {
      const scheme = createColorScheme({ systemAs: 'system' });
      expect(document.documentElement.getAttribute('data-theme')).toBe('system');
      scheme.set('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      dispose();
    }));

  it('reads a stored choice', () =>
    createRoot((dispose) => {
      document.cookie = `color-scheme=${encodeURIComponent(JSON.stringify({ v: 1, value: 'dark', createdAt: 1 }))}; Path=/`;
      expect(createColorScheme().value()).toBe('dark');
      dispose();
    }));
});

describe('providers', () => {
  it('hands a scheme and other axes down, nested providers adding to each other', () => {
    let seen: unknown[] = [];
    createRoot((dispose) => {
      ColorSchemeProvider({
        storage: null,
        get children() {
          return ThemeProvider({
            themes: { palette: 'ink' },
            get children() {
              seen = [useColorScheme().value(), useTheme('palette')];
              return null;
            },
          });
        },
      });
      dispose();
    });
    expect(seen).toEqual(['system', 'ink']);
  });

  it('says which theme is missing', () => {
    expect(() => createRoot(() => useTheme('palette'))).toThrow('No theme named "palette"');
  });
});

describe('the before-paint script', () => {
  it('applies a stored choice to the attribute and the browser bar colour', () => {
    document.head.innerHTML =
      '<meta name="theme-color" content="#fafaf9" media="(prefers-color-scheme: light)">' +
      '<meta name="theme-color" content="#111110" media="(prefers-color-scheme: dark)">' +
      '<meta name="color-scheme" content="light dark">';
    document.cookie = `color-scheme=${encodeURIComponent(JSON.stringify({ v: 1, value: 'dark', createdAt: 1 }))}; Path=/`;
    const script = createRoot((dispose) => {
      const body = createColorScheme({ themeColor: { light: '#fafaf9', dark: '#111110' } }).headScript();
      dispose();
      return body;
    });
    document.documentElement.removeAttribute('data-theme');
    new Function(script.replace(/^<script>|<\/script>$/g, ''))();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
    expect(metas.map((m) => [m.getAttribute('content'), m.getAttribute('media')])).toEqual([
      ['#111110', null],
      ['#111110', null],
    ]);
    expect(document.querySelector('meta[name="color-scheme"]')!.getAttribute('content')).toBe('dark');
  });
});
