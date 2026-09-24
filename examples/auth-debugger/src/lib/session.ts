/**
 * One service at a time, rebuilt when the provider or mode changes.
 *
 * `createAuthService` wires a session to a client at construction, so switching provider
 * builds a new service rather than mutating one. A session belongs to the provider that
 * issued it, and carrying one across a switch would show one provider's user beside
 * another's tokens.
 *
 * The selection is kept in storage because the redirect unloads the page.
 */
import { createAuthService, type AuthService } from '@fluixi/oauth2';
import { signal } from '@fluixi/reactive/signal';
import { configFor, PROVIDERS, type ProviderId } from './providers.js';

export type Mode = 'browser' | 'server';

const SELECTION_KEY = 'fx.debugger.selection';

export interface Selection {
  provider: ProviderId;
  mode: Mode;
}

function store(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** What was chosen before the redirect, or a default that works with no setup. */
export function readSelection(): Selection {
  const raw = store()?.getItem(SELECTION_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Selection;
      if (PROVIDERS[parsed.provider]) return parsed;
    } catch {
      // A hand-edited or stale value: fall through to the default rather than failing.
    }
  }
  // Keycloak in browser mode: the one combination that needs no credentials beyond a
  // local container.
  return { provider: 'keycloak', mode: 'browser' };
}

export function writeSelection(selection: Selection): void {
  store()?.setItem(SELECTION_KEY, JSON.stringify(selection));
}

/**
 * The current selection, reactive, so the page follows a change without a reload.
 *
 * Starts at the default rather than at what is stored: storage exists only in a browser,
 * so reading it here would make the server render one provider and the client another,
 * and hydration would find a mismatch and keep the server's. `restoreSelection` is called
 * once the page is mounted.
 */
export const selection = signal<Selection>({ provider: 'keycloak', mode: 'browser' });

/** Adopt what was stored, after mount. */
export function restoreSelection(): void {
  const stored = readSelection();
  const current = selection();
  if (stored.provider !== current.provider || stored.mode !== current.mode) {
    selection.set(stored);
    services.clear();
  }
}

export function select(next: Partial<Selection>): void {
  const merged = { ...selection(), ...next };
  const provider = PROVIDERS[merged.provider];

  // A provider that cannot run in the chosen mode is switched to one it can, so a
  // refusal shows as an unavailable option rather than a failed exchange later.
  if (!provider.modes.includes(merged.mode)) merged.mode = provider.modes[0];

  writeSelection(merged);
  selection.set(merged);
  services.clear();
}

/**
 * One service per provider and mode, built on first use.
 *
 * Cached because `createAuthService` starts a reactive effect bridging the session into
 * the hooks, and building a second for the same pair would leave two of them running.
 */
const services = new Map<string, AuthService<Record<string, unknown>>>();

/**
 * The service for a selection, defaulting to what is stored.
 *
 * Storage is the one source of truth: `select` writes there first, and a redirect unloads
 * the page anyway. The signal exists for rendering and starts at its default until a page
 * restores it, so defaulting to the signal here built a service for the wrong provider
 * whenever a page had not restored yet, which surfaced as a state mismatch.
 */
export function serviceFor(
  sel: Selection = typeof window === 'undefined' ? selection() : readSelection(),
): AuthService<Record<string, unknown>> {
  const key = `${sel.provider}:${sel.mode}`;
  const existing = services.get(key);
  if (existing) return existing;

  const appUrl =
    typeof location === 'undefined' ? 'http://localhost:3000' : location.origin;

  const service = createAuthService<Record<string, unknown>>({
    config: configFor(PROVIDERS[sel.provider], sel.mode, appUrl),
    // No `access` block: this app reports what a provider sent rather than deciding what
    // anyone may do.
  });

  services.set(key, service);
  return service;
}

/** The service for the current selection, for a component that just needs it. */
export const currentService = () => serviceFor(selection());
