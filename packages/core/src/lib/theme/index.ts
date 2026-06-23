/**
 * createTheme — a reusable, SSR-safe theme store so every Fluixi app gets the whole
 * theme workflow (detect → persist → apply → toggle, + the no-flash head script)
 * without rewriting it. Generic over an arbitrary theme list (not just light/dark),
 * with optional async theme loading and lifecycle hooks.
 *
 * Built on the universal `storage` + `env` utilities, so reading the stored theme at
 * module-eval and touching `document`/`matchMedia` are safe on the server.
 */
import { createSignal, type Accessor } from '@fluixi/reactive/signal';
import { storage, env } from '../env/index.js';

export interface ThemeOptions<T extends string> {
  /** The full set of themes. `toggle()` cycles through them in order. */
  themes: readonly T[];
  /** Theme used when nothing is stored and system preference doesn't apply. */
  default: T;
  /** localStorage key the choice is persisted under (default `"theme"`). */
  storageKey?: string;
  /** Attribute set on `<html>` to drive CSS (default `"data-theme"`). */
  attribute?: string;
  /**
   * Follow `prefers-color-scheme` when there is no stored choice. `true` assumes the
   * themes literally include `"dark"`/`"light"`; pass `{ dark, light }` to map explicitly.
   */
  system?: boolean | { dark: T; light: T };
  /** Optional async work per theme (e.g. lazy-import a CSS bundle). Drives `isLoading()`. */
  load?: (theme: T) => void | Promise<void>;
  /** Fired after a theme is applied. */
  onChange?: (next: T, prev: T | undefined) => void;
  /** Fired when an async `load` starts / finishes. */
  onLoading?: (theme: T) => void;
  onLoaded?: (theme: T) => void;
}

export interface Theme<T extends string> {
  /** Reactive current theme. */
  value: Accessor<T>;
  /** Reactive — true while an async `load` is running. */
  isLoading: Accessor<boolean>;
  /** Set a specific theme (persists, applies, runs `load`/hooks). */
  set: (theme: T) => void;
  /** Cycle to the next theme in `themes`. */
  toggle: () => void;
  /** Apply the current theme to the DOM (call once on client mount). */
  init: () => void;
  /** Inline `<script>` for `<head>` that sets the attribute BEFORE first paint (no flash). */
  headScript: () => string;
}

function systemMap<T extends string>(
  system: ThemeOptions<T>['system'],
): { dark: T; light: T } | null {
  if (!system) return null;
  if (system === true) return { dark: 'dark' as T, light: 'light' as T };
  return system;
}

export function createTheme<T extends string>(options: ThemeOptions<T>): Theme<T> {
  const storageKey = options.storageKey ?? 'theme';
  const attribute = options.attribute ?? 'data-theme';
  const sys = systemMap(options.system);

  const detectInitial = (): T => {
    const stored = storage.getItem(storageKey) as T | null;
    if (stored && options.themes.includes(stored)) return stored;
    if (sys && env.window?.matchMedia?.('(prefers-color-scheme: dark)')?.matches) return sys.dark;
    if (sys) return sys.light;
    return options.default;
  };

  const [value, setValue] = createSignal<T>(detectInitial());
  const [isLoading, setLoading] = createSignal(false);

  const apply = (t: T): void => {
    env.document?.documentElement.setAttribute(attribute, t);
    try {
      storage.setItem(storageKey, t);
    } catch {
      /* best-effort persistence */
    }
  };

  const set = (t: T): void => {
    if (!options.themes.includes(t)) return;
    const prev = value();
    setValue(() => t);
    apply(t);
    options.onChange?.(t, prev);
    if (options.load) {
      setLoading(true);
      options.onLoading?.(t);
      Promise.resolve(options.load(t)).finally(() => {
        setLoading(false);
        options.onLoaded?.(t);
      });
    }
  };

  const toggle = (): void => {
    const i = options.themes.indexOf(value());
    set(options.themes[(i + 1) % options.themes.length]);
  };

  const init = (): void => apply(value());

  const headScript = (): string => {
    const cfg = JSON.stringify({
      k: storageKey,
      a: attribute,
      d: options.default,
      sys,
    });
    // Runs before paint: read stored choice (or system pref), set the attribute, so the
    // server-rendered HTML never flashes the default theme before hydration.
    return (
      `<script>(function(){try{var c=${cfg},t=localStorage.getItem(c.k);` +
      `if(!t&&c.sys)t=matchMedia('(prefers-color-scheme: dark)').matches?c.sys.dark:c.sys.light;` +
      `if(!t)t=c.d;document.documentElement.setAttribute(c.a,t);}catch(e){}})();</script>`
    );
  };

  return { value, isLoading, set, toggle, init, headScript };
}
