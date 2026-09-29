/**
 * Contexts the app and the elements share.
 *
 * Made with `@fluixi/reactive` so an element's standalone build does not pull in
 * `@fluixi/core`; the app provides them with core's helpers all the same. Each holds an
 * accessor, so a change in the app reaches every element reading it.
 */
import { createContext, type Accessor } from '@fluixi/reactive/signal';

export type ThemeName = 'light' | 'dark';

/** Light unless provided: an element drawn dark got its theme from the app. */
export const Theme = createContext<Accessor<ThemeName>>(() => 'light', 'theme');

/** The colour elements draw their accents with. */
export const Accent = createContext<Accessor<string>>(() => '#2563eb', 'accent');
