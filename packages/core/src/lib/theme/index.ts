/**
 * createTheme, a reusable, SSR-safe theme store so every Fluixi app gets the whole
 * theme workflow (detect -> persist -> apply -> toggle, + the no-flash head script)
 * without rewriting it. Generic over an arbitrary theme list (not just light/dark),
 * with optional async theme loading and lifecycle hooks.
 *
 * The choice lives in a cookie by default, so the server render reads it and sends
 * `<html data-theme>` already set: no flash and no mismatch for a returning visitor.
 */
import { getActiveHead, useHead } from '@fluixi/head';
import { createSignal, type Accessor } from '@fluixi/reactive/signal';
import { StorageUnavailableError, type TypedStorage } from '@fluixi/storage';
import { env } from '../env/index.js';
import { persisted } from '../storage/persisted.js';
import { useStorage } from '../storage/index.js';

export interface ThemeOptions<T extends string> {
  /** The full set of themes. `toggle()` cycles through them in order. */
  themes: readonly T[];
  /** Theme used when nothing is stored and system preference doesn't apply. */
  default: T;
  /** Key the choice is stored under (default `"theme"`). */
  storageKey?: string;
  /**
   * Where the choice is kept. Defaults to a cookie for a year (`useStorage({ scope: 'cookie' })`),
   * which the server render can read. `null` keeps it in memory only. Created outside a
   * request on the server, there is no cookie to read, so the default falls back to memory.
   */
  storage?: TypedStorage<any> | null;
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
  /**
   * Send the before-paint script with the page, through the head, during a render. It applies a
   * stored choice the server could not read (a prerendered page) and the OS preference before a
   * first choice. Default true; `headScript()` returns the same script for a page you write.
   */
  script?: boolean;
  /** Fired when an async `load` starts / finishes. */
  onLoading?: (theme: T) => void;
  onLoaded?: (theme: T) => void;
}

export interface Theme<T extends string> {
  /** Reactive current theme. */
  value: Accessor<T>;
  /** Reactive: true while an async `load` is running. */
  isLoading: Accessor<boolean>;
  /** Set a specific theme (persists, applies, runs `load`/hooks). */
  set: (theme: T) => void;
  /** Cycle to the next theme in `themes`. */
  toggle: () => void;
  /** Apply the current theme to the DOM and run its `load` (call once on client mount). */
  init: () => void;
  /** Inline `<script>` for `<head>` that sets the attribute before first paint (no flash). */
  headScript: () => string;
}

function systemMap<T extends string>(
  system: ThemeOptions<T>['system'],
): { dark: T; light: T } | null {
  if (!system) return null;
  if (system === true) return { dark: 'dark' as T, light: 'light' as T };
  return system;
}

const YEAR = 60 * 60 * 24 * 365;

/** @internal: a cookie for a year, or memory outside a request on the server. */
export function defaultStorage(): TypedStorage<any> | null {
  try {
    return useStorage({ scope: 'cookie', cookie: { maxAge: YEAR, sameSite: 'lax' } });
  } catch (error) {
    if (error instanceof StorageUnavailableError) return null;
    throw error;
  }
}

/** How the head script finds the stored choice before any module has loaded. */
/** @internal */
export function storedLookup(storage: TypedStorage<any> | null, key: string): { from: 'cookie' | 'local'; name: string } | null {
  if (!storage) return null;
  const full = storage.keyPrefix + key;
  if (storage.scope === 'cookie') {
    return { from: 'cookie', name: encodeURIComponent(full).replace(/[()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`) };
  }
  if (storage.scope === 'local') return { from: 'local', name: full };
  return null;
}

/**
 * A theme controller: a reactive current theme, written to an attribute on the document.
 *
 * The initial value is taken from storage, then from the system preference, then from
 * `options.default`, so a returning visitor keeps their choice and a new one gets what
 * their OS asked for. The attribute defaults to `data-theme`, which is what a CSS
 * `[data-theme="dark"]` block selects on.
 *
 * @example
 * ```ts
 * const theme = createTheme({ themes: ['light', 'dark'], system: { dark: 'dark' } });
 * theme.set('dark');
 * theme.value();     // 'dark', and the document now carries data-theme="dark"
 * ```
 */
export function createTheme<T extends string>(options: ThemeOptions<T>): Theme<T> {
  const storageKey = options.storageKey ?? 'theme';
  const attribute = options.attribute ?? 'data-theme';
  const sys = systemMap(options.system);
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const valid = (t: unknown): t is T => typeof t === 'string' && options.themes.includes(t as T);

  // Without a stored choice: the system preference where there is one to ask, else the default.
  const fallback: T =
    sys && env.window?.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? sys.dark : sys ? sys.light : options.default;
  const stored = storage ? persisted(storage, storageKey) : null;
  // Holds a choice the storage refused (a cookie after the response went out), so the page still switches.
  const [unsaved, setUnsaved] = createSignal<T | null>(null);
  const value: Accessor<T> = () => {
    const local = unsaved();
    if (local !== null) return local;
    const saved = stored?.();
    return valid(saved) ? saved : fallback;
  };
  const [isLoading, setLoading] = createSignal(false);

  const apply = (t: T): void => {
    env.document?.documentElement.setAttribute(attribute, t);
  };

  const runLoad = (t: T): void => {
    if (!options.load) return;
    setLoading(true);
    options.onLoading?.(t);
    Promise.resolve(options.load(t)).finally(() => {
      setLoading(false);
      options.onLoaded?.(t);
    });
  };

  const set = (t: T): void => {
    if (!options.themes.includes(t)) return;
    const prev = value();
    try {
      stored?.set(t);
      setUnsaved(stored ? null : t);
    } catch {
      setUnsaved(() => t);
    }
    apply(t);
    options.onChange?.(t, prev);
    runLoad(t);
  };
  const toggle = (): void => {
    const i = options.themes.indexOf(value());
    set(options.themes[(i + 1) % options.themes.length]);
  };

  // A stored choice needs what `load` brings as much as a fresh one (a skin's stylesheet), or
  // the attribute names a theme whose rules never arrive. Browser only: there is no page to style
  // on the server.
  const init = (): void => {
    apply(value());
    if (env.document) runLoad(value());
  };

  const scriptBody = (): string => {
    const cfg = JSON.stringify({ s: storedLookup(storage, storageKey), a: attribute, d: options.default, sys, ts: options.themes }).replace(/</g, '\\u003c');
    // Runs before paint: read the stored choice (or the system preference) and set the
    // attribute, for pages the server did not render with it. Stored values are envelopes.
    return (
      `(function(){try{var c=${cfg},t=null,s=c.s,r=null;` +
      `if(s&&s.from==='local')r=localStorage.getItem(s.name);` +
      `if(s&&s.from==='cookie')document.cookie.split('; ').forEach(function(p){var i=p.indexOf('=');if(p.slice(0,i)===s.name)r=decodeURIComponent(p.slice(i+1));});` +
      `if(r){var e=JSON.parse(r);t=e&&e.v===1?e.value:e;}` +
      `if(c.ts.indexOf(t)<0)t=null;` +
      `if(!t&&c.sys)t=matchMedia('(prefers-color-scheme: dark)').matches?c.sys.dark:c.sys.light;` +
      `if(!t)t=c.d;document.documentElement.setAttribute(c.a,t);}catch(e){}})();`
    );
  };
  const headScript = (): string => `<script>${scriptBody()}</script>`;

  // During a render the attribute goes out with the page; on the client the head keeps it current.
  // A prerendered page, or a first visit before any choice, has nothing the server could know;
  // the script settles it before paint, from the same configuration.
  if (getActiveHead()) {
    useHead({
      htmlAttrs: { [attribute]: () => value() },
      ...(options.script === false ? {} : { script: [{ children: scriptBody() }] }),
    });
  }

  return { value, isLoading, set, toggle, init, headScript };
}
