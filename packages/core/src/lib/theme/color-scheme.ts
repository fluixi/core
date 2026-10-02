/**
 * Light, dark, or whatever the operating system says: the theme axis almost every app has.
 *
 * Built on the same pieces as `createTheme` (a cookie by default, the attribute and a
 * before-paint script sent through the head during a render), with what a scheme needs on top:
 * `system` as a choice, `resolved()` for what is actually shown, which follows the OS live, and
 * a `toggle` that flips from what the reader sees.
 */
import { getActiveHead, useHead } from '@fluixi/head';
import { createEffect, createSignal, getOwner, onCleanup, type Accessor } from '@fluixi/reactive/signal';
import type { TypedStorage } from '@fluixi/storage';
import { env } from '../env/index.js';
import { persisted } from '../storage/persisted.js';
import { defaultStorage, storedLookup } from './index.js';

export type ColorSchemeChoice = 'system' | 'light' | 'dark';

export interface ColorSchemeOptions {
  /** Key the choice is stored under. Default `color-scheme`. */
  storageKey?: string;
  /** Attribute set on `<html>`. Default `data-theme`. */
  attribute?: string;
  /** Where the choice is kept: a cookie for a year by default, `null` for memory only. */
  storage?: TypedStorage<any> | null;
  /**
   * What the attribute says while following the OS. `resolved` (default) writes `light` or
   * `dark`, for CSS that selects on `[data-theme="dark"]`. `system` writes `system`, for CSS
   * that follows the OS by itself (`color-scheme`, a media query): a page without JavaScript
   * then still matches the OS.
   */
  systemAs?: 'resolved' | 'system';
  /**
   * The browser UI colour for each scheme: Chrome's address and app bar on Android, Safari's bars
   * on iOS. While following the OS both are sent, each under its media query, and the browser
   * picks; after a choice, the chosen one.
   */
  themeColor?: { light: string; dark: string };
  /**
   * Send `<meta name="color-scheme">` too (`light dark` while following the OS, else the
   * choice), so form controls, scrollbars and the page behind the CSS match. Default true.
   */
  colorSchemeMeta?: boolean;
  /** Send the before-paint script with the page during a render. Default true. */
  script?: boolean;
  onChange?: (choice: ColorSchemeChoice) => void;
}

export interface ColorScheme {
  /** The choice: `system`, `light` or `dark`. */
  value: Accessor<ColorSchemeChoice>;
  /** What is shown: the choice, or the OS's scheme while the choice is `system`. */
  resolved: Accessor<'light' | 'dark'>;
  set: (choice: ColorSchemeChoice) => void;
  /** Flips light and dark, from what is shown. */
  toggle: () => void;
  /** Writes the attribute now; the head and the scheme's own effect keep it current after. */
  init: () => void;
  /** The before-paint script, for a page you write yourself. */
  headScript: () => string;
}

const CHOICES: readonly ColorSchemeChoice[] = ['system', 'light', 'dark'];
const DARK = '(prefers-color-scheme: dark)';

/**
 * A light/dark scheme with the OS as the default. Create it during a render (a provider at the
 * app root does), so the server reads the visitor's cookie.
 *
 * @example
 * ```ts
 * const scheme = createColorScheme({ storageKey: 'app-scheme' });
 * scheme.toggle();   // dark if the page shows light, and remembered
 * scheme.resolved(); // 'dark'
 * ```
 */
export function createColorScheme(options: ColorSchemeOptions = {}): ColorScheme {
  const storageKey = options.storageKey ?? 'color-scheme';
  const attribute = options.attribute ?? 'data-theme';
  const systemAs = options.systemAs ?? 'resolved';
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const saved = storage ? persisted(storage, storageKey) : null;
  const [unsaved, setUnsaved] = createSignal<ColorSchemeChoice | null>(null);

  const value: Accessor<ColorSchemeChoice> = () => {
    const local = unsaved();
    if (local) return local;
    const stored = saved?.();
    return CHOICES.includes(stored as ColorSchemeChoice) ? (stored as ColorSchemeChoice) : 'system';
  };

  // The OS scheme, followed live in the browser. The server cannot know it: light there, and the
  // script corrects it before paint.
  const media = env.window?.matchMedia?.(DARK);
  const [osDark, setOsDark] = createSignal(media?.matches ?? false);
  if (media) {
    const onChange = () => setOsDark(media.matches);
    media.addEventListener?.('change', onChange);
    if (getOwner()) onCleanup(() => media.removeEventListener?.('change', onChange));
  }

  const resolved = (): 'light' | 'dark' => {
    const choice = value();
    return choice === 'system' ? (osDark() ? 'dark' : 'light') : choice;
  };
  const shown = (): string => (systemAs === 'system' && value() === 'system' ? 'system' : resolved());

  const apply = (): void => {
    env.document?.documentElement.setAttribute(attribute, shown());
  };

  const set = (choice: ColorSchemeChoice): void => {
    if (!CHOICES.includes(choice)) return;
    if (!saved) setUnsaved(choice);
    else {
      try {
        saved.set(choice);
        setUnsaved(null);
      } catch {
        // Not saved (the response already went out, storage blocked): the page still switches.
        setUnsaved(choice);
      }
    }
    apply();
    options.onChange?.(choice);
  };

  const scriptBody = (): string => {
    const cfg = JSON.stringify({ s: storedLookup(storage, storageKey), a: attribute, sys: systemAs === 'system', tc: options.themeColor ?? null, cs: options.colorSchemeMeta !== false }).replace(/</g, '\\u003c');
    return (
      `(function(){try{var c=${cfg},t=null,s=c.s,r=null;` +
      `if(s&&s.from==='local')r=localStorage.getItem(s.name);` +
      `if(s&&s.from==='cookie')document.cookie.split('; ').forEach(function(p){var i=p.indexOf('=');if(p.slice(0,i)===s.name)r=decodeURIComponent(p.slice(i+1));});` +
      `if(r){var e=JSON.parse(r);t=e&&e.v===1?e.value:e;}` +
      `var chosen=t==='light'||t==='dark'?t:null;` +
      `if(!chosen)t=c.sys?'system':(matchMedia('${DARK}').matches?'dark':'light');` +
      `document.documentElement.setAttribute(c.a,t);` +
      // A chosen scheme also decides the browser's bars and controls, which the page sent for the OS.
      `if(chosen&&c.tc)document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',c.tc[chosen]);m.removeAttribute('media');});` +
      `if(chosen&&c.cs){var m=document.querySelector('meta[name="color-scheme"]');if(m)m.setAttribute('content',chosen);}` +
      `}catch(e){}})();`
    );
  };

  if (getActiveHead()) {
    const colors = options.themeColor;
    useHead({
      htmlAttrs: { [attribute]: shown },
      ...(colors
        ? {
            themeColor: () =>
              value() === 'system'
                ? [
                    { color: colors.light, media: '(prefers-color-scheme: light)' },
                    { color: colors.dark, media: DARK },
                  ]
                : colors[resolved()],
          }
        : {}),
      ...(options.colorSchemeMeta === false ? {} : { colorScheme: () => (value() === 'system' ? 'light dark' : resolved()) }),
      ...(options.script === false ? {} : { script: [{ children: scriptBody() }] }),
    });
  }
  // In the browser the attribute follows the OS while the choice is `system`.
  if (env.document && getOwner()) createEffect(apply);

  return {
    value,
    resolved,
    set,
    toggle: () => set(resolved() === 'dark' ? 'light' : 'dark'),
    init: apply,
    headScript: () => `<script>${scriptBody()}</script>`,
  };
}
