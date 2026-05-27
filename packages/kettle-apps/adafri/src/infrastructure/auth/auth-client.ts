import { env } from '../../config/env.js';
import { sessionStore } from './session.store.js';
import { accountStore } from '../../store/account.js';
import {
  ROUTES,
  SESSION_TOKEN_KEY,
  SESSION_EXPIRY_KEY,
  SESSION_PROFILE_REFRESHED_AT_KEY,
} from '../../config/constants.js';
import type { User } from '../../domain/users/user.model.js';
import type { User as BaseUser } from '@awc/helpers/user';

const REDIRECT_URI = `${env.appUrl}${ROUTES.callback}`;
const PKCE_VERIFIER_KEY = 'pkce_code_verifier';

/** Re-fetch the user profile if it hasn't been refreshed within this window. */
const PROFILE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

interface TokenResponse {
  access_token: string;
  expires_in:   number;
  token_type:   'Bearer';
}

// ── PKCE helpers ─────────────────────────────────────────────────────────────

/** Generate a cryptographically-random code_verifier (RFC 7636 §4.1). */
function generateVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

/** SHA-256 the verifier and return the base64url-encoded code_challenge. */
async function generateChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(new Uint8Array(digest));
}

function base64urlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ── Profile fetch utility ─────────────────────────────────────────────────────

/**
 * Fetch the current user profile from the auth service.
 * Uses the `/me` endpoint with the provided Bearer token.
 */
async function fetchUserProfile(token: string): Promise<User> {
  const res = await fetch(`${env.authServiceUrl}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  const body: { data: BaseUser; status: string } = await res.json();
  const { data } = body;
  return {
    ...data,
    fullName: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim(),
    role: 'user',
  };
}

// ── Auth client ───────────────────────────────────────────────────────────────

export const authClient = {
  /**
   * Step 1 — generate PKCE pair, persist the verifier, then redirect to the
   * OAuth authorization endpoint with the code_challenge attached.
   * `state` encodes the page to restore after login.
   *
   * The PKCE verifier is kept in sessionStorage intentionally: it is a
   * short-lived secret tied to this browser tab's login attempt.
   */
  async redirectToLogin(state?: string): Promise<void> {
    const verifier = generateVerifier();
    const challenge = await generateChallenge(verifier);

    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);

    const params = new URLSearchParams({
      response_type:         'code',
      client_id:             env.clientId,
      redirect_uri:          REDIRECT_URI,
      scope:                 'openid profile email',
      code_challenge:        challenge,
      code_challenge_method: 'S256',
      ...(state ? { state } : {}),
    });
    window.location.replace(`${env.authServiceUrl}/v1/o/authorize?${params}`);
  },

  /**
   * Step 2 — retrieve the stored code_verifier, exchange the authorization
   * code for a token, then fetch the user profile.
   * Called from the /auth/callback page.
   */
  async handleCallback(code: string): Promise<void> {
    const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
    if (!codeVerifier) {
      throw new Error('PKCE code_verifier not found — restart the login flow');
    }
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);

    //`${env.apiUrl}/oauth2/token`
    const tokenRes = await fetch(`${env.authServiceUrl}/v1/o/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
        client_id:     env.clientId,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({})) as any;
      throw new Error(err.error_description ?? 'OAuth token exchange failed');
    }

    const token: TokenResponse = await tokenRes.json();
    const user = await fetchUserProfile(token.access_token);

    sessionStore.establish(token.access_token, token.expires_in, user);
    localStorage.setItem(SESSION_PROFILE_REFRESHED_AT_KEY, String(Date.now()));
  },

  /**
   * On page load: validate the stored token and refresh the user profile if
   * it is stale. No polling — runs once per page load.
   *
   * - Token missing / no session → no-op (auth guard handles redirect).
   * - Token expired              → clear session and retrigger OAuth.
   * - Profile stale (> 30 min)  → re-fetch profile silently; on failure
   *                                clear session and retrigger OAuth.
   */
  async initSession(): Promise<void> {
    const token  = localStorage.getItem(SESSION_TOKEN_KEY);
    const expiry = Number(localStorage.getItem(SESSION_EXPIRY_KEY)  || null);

    if (!token || !expiry) return; // no stored session

    if (Date.now() > expiry) {
      // Token is expired — clear the session so isAuthenticated() becomes false
      // and the reactive auth guard redirects to /login.
      accountStore.clear();
      sessionStore.destroy();
      return;
    }

    // Token is valid — check if the profile cache is stale
    const lastRefreshed = Number(localStorage.getItem(SESSION_PROFILE_REFRESHED_AT_KEY)) || 0;
    if (Date.now() - lastRefreshed > PROFILE_MAX_AGE) {
      try {
        const user = await fetchUserProfile(token);
        sessionStore.updateUser(user);
        localStorage.setItem(SESSION_PROFILE_REFRESHED_AT_KEY, String(Date.now()));
      } catch {
        // Token was revoked or auth service unreachable — clear session so the
        // reactive auth guard redirects to /login.
        accountStore.clear();
        sessionStore.destroy();
      }
    }
  },

  /**
   * Manually refresh the user profile on demand.
   * No-op if no active session.
   */
  async refreshProfile(): Promise<void> {
    const token = sessionStore.token();
    if (!token) return;
    const user = await fetchUserProfile(token);
    sessionStore.updateUser(user);
    localStorage.setItem(SESSION_PROFILE_REFRESHED_AT_KEY, String(Date.now()));
  },

  logout(): void {
    accountStore.clear();
    sessionStore.destroy();
    const params = new URLSearchParams({
      client_id:    env.clientId,
      redirect_uri: `${env.appUrl}${ROUTES.login}`,
    });
    window.location.replace(`${env.authServiceUrl}/logout?${params}`);
  },
} as const;
