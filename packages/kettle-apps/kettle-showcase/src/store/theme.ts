// Gestion du thème global (clair/sombre) via signaux
import { createSignal, createContext, useContext } from '@awc/kettlejs';
import type { JSX } from '@awc/kettlejs';

export interface ThemeState {
  isDark: () => boolean;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeState>();

export function ThemeProvider(props: { children?: any }) {
  const [isDark, setIsDark] = createSignal(false);
  const toggle = () => setIsDark((v) => !v);

  return ThemeContext.Provider({
    value: { isDark, toggle },
    children: props.children,
  }) as JSX.Element;
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext)!;
}
