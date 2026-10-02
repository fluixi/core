/**
 * Themes for the components below: the app root makes them during the render, the provider
 * hands them down, and any component, or a custom element, reads them.
 */
import { createContext, useContext } from '../context/context.js';
import { createColorScheme, type ColorScheme, type ColorSchemeOptions } from './color-scheme.js';

const ThemesContext = createContext<Readonly<Record<string, unknown>> | undefined>(undefined, 'themes');

/**
 * Several theme axes at once, by name: a scheme, a palette, a density.
 *
 * @example
 * ```tsx
 * const scheme = createColorScheme({ storageKey: 'app-scheme' });
 * const palette = createTheme({ themes: ['ink', 'saffron'], default: 'ink', attribute: 'data-accent' });
 *
 * <ThemeProvider themes={{ scheme, palette }}>{props.children}</ThemeProvider>
 * ```
 */
export function ThemeProvider(props: { themes: Readonly<Record<string, unknown>>; children?: unknown }): any {
  const outer = useContext(ThemesContext);
  return ThemesContext.Provider({
    // A nested provider adds to the axes above it rather than hiding them.
    value: outer ? { ...outer, ...props.themes } : props.themes,
    get children() {
      return props.children as any;
    },
  });
}

/** The theme axis `name` from the nearest provider. Throws when none provides it. */
export function useTheme<T = unknown>(name: string): T {
  const themes = useContext(ThemesContext);
  if (!themes || !(name in themes)) {
    throw new Error(`[fluixi] No theme named "${name}" above this component: provide it with <ThemeProvider> or <ColorSchemeProvider>.`);
  }
  return themes[name] as T;
}

/**
 * A color scheme made here, during the render, and provided as the `scheme` axis.
 *
 * @example
 * ```tsx
 * <ColorSchemeProvider storageKey="app-scheme">
 *   <App />
 * </ColorSchemeProvider>
 * ```
 */
export function ColorSchemeProvider(props: ColorSchemeOptions & { children?: unknown }): any {
  const scheme = createColorScheme(props);
  return ThemeProvider({
    themes: { scheme },
    get children() {
      return props.children;
    },
  });
}

/** The `scheme` axis: from `<ColorSchemeProvider>`, or a `ThemeProvider` that names one `scheme`. */
export function useColorScheme(): ColorScheme {
  return useTheme<ColorScheme>('scheme');
}
