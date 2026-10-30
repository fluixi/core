// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTheme } from './index.js';

const clearCookies = () => {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]!.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
};
const envelope = (value: string) => encodeURIComponent(JSON.stringify({ v: 1, value, createdAt: 1 }));

beforeEach(() => {
  clearCookies();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-mode');
});

describe('createTheme', () => {
  it('defaults when nothing stored, applies the attribute on set, and persists', () => {
    const theme = createTheme({ themes: ['light', 'dark'] as const, default: 'light' });
    expect(theme.value()).toBe('light');
    theme.set('dark');
    expect(theme.value()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.cookie).toContain(`theme=${envelope('dark').slice(0, 20)}`);
  });

  it('reads the stored theme over the default at creation, ignoring values not in the list', () => {
    document.cookie = `mode=${envelope('dark')}; Path=/`;
    const theme = createTheme({
      themes: ['light', 'dark'] as const,
      default: 'light',
      storageKey: 'mode',
    });
    expect(theme.value()).toBe('dark');
    document.cookie = `mode=${envelope('neon')}; Path=/`;
    expect(createTheme({ themes: ['light', 'dark'] as const, default: 'light', storageKey: 'mode' }).value()).toBe('light');
  });

  it('keeps the choice in memory with storage: null', () => {
    const theme = createTheme({ themes: ['light', 'dark'] as const, default: 'light', storage: null });
    theme.set('dark');
    expect(theme.value()).toBe('dark');
    expect(document.cookie).not.toContain('theme=');
  });

  it('toggle cycles through the themes list', () => {
    const theme = createTheme({ themes: ['a', 'b', 'c'] as const, default: 'a' });
    theme.toggle();
    expect(theme.value()).toBe('b');
    theme.toggle();
    expect(theme.value()).toBe('c');
    theme.toggle();
    expect(theme.value()).toBe('a'); // wraps
  });

  it('runs hooks and drives isLoading around an async load', async () => {
    const onChange = vi.fn();
    let resolve!: () => void;
    const theme = createTheme({
      themes: ['light', 'dark'] as const,
      default: 'light',
      onChange,
      load: () => new Promise<void>((r) => (resolve = r)),
    });
    theme.set('dark');
    expect(onChange).toHaveBeenCalledWith('dark', 'light');
    expect(theme.isLoading()).toBe(true);
    resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(theme.isLoading()).toBe(false);
  });

  it('init runs load for a stored choice, not only on set', () => {
    document.cookie = `skin=${envelope('glass')}; Path=/`;
    const load = vi.fn();
    const theme = createTheme({ themes: ['plain', 'glass'] as const, default: 'plain', storageKey: 'skin', attribute: 'data-ui', load });
    theme.init();
    expect(document.documentElement.getAttribute('data-ui')).toBe('glass');
    expect(load).toHaveBeenCalledWith('glass');
    document.documentElement.removeAttribute('data-ui');
  });

  it('headScript embeds the storage key + attribute and sets the attribute', () => {
    const theme = createTheme({
      themes: ['light', 'dark'] as const,
      default: 'light',
      storageKey: 'mode',
      attribute: 'data-mode',
      system: true,
    });
    const s = theme.headScript();
    expect(s).toContain('<script>');
    expect(s).toContain('mode');
    expect(s).toContain('data-mode');
    expect(s).toContain('prefers-color-scheme: dark');
  });

  it('headScript applies the stored cookie before anything loads', () => {
    document.cookie = `mode=${envelope('dark')}; Path=/`;
    const s = createTheme({ themes: ['light', 'dark'] as const, default: 'light', storageKey: 'mode', attribute: 'data-mode' }).headScript();
    document.documentElement.removeAttribute('data-mode');
    new Function(s.replace(/^<script>|<\/script>$/g, ''))();
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
  });
});
