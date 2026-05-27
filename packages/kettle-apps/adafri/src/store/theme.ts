import { createSignal, createContext, createProvider, useContext } from '@awc/kettlejs';

export type Theme = 'light' | 'dark';

const [_theme, _setTheme] = createSignal<Theme>(
  (localStorage.getItem('adafri:theme') as Theme) ?? 'light',
);

export const themeStore = {
  theme: _theme,
  toggle() {
    const next: Theme = _theme() === 'light' ? 'dark' : 'light';
    localStorage.setItem('adafri:theme', next);
    _setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  },
  set(t: Theme) {
    localStorage.setItem('adafri:theme', t);
    _setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
  },
} as const;

// Apply on init
document.documentElement.setAttribute('data-theme', _theme());

export type ThemeState = typeof themeStore;
export const ThemeContext = createContext<ThemeState>();

export function ThemeProvider({ children }: { children?: any }) {
  return createProvider({ context: ThemeContext, value: themeStore, children });
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext)!;
}
