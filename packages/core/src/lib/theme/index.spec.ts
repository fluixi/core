// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTheme } from './index.js';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('createTheme', () => {
  it('defaults when nothing stored, applies the attribute on set, and persists', () => {
    const theme = createTheme({ themes: ['light', 'dark'] as const, default: 'light' });
    expect(theme.value()).toBe('light');
    theme.set('dark');
    expect(theme.value()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('reads the stored theme over the default at creation', () => {
    localStorage.setItem('mode', 'dark');
    const theme = createTheme({
      themes: ['light', 'dark'] as const,
      default: 'light',
      storageKey: 'mode',
    });
    expect(theme.value()).toBe('dark');
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
});
