import { env } from '../../config/env.js';
import { sessionStore } from './session.store.js';
import {
  ROUTES,
  SESSION_TOKEN_KEY,
  SESSION_EXPIRY_KEY,
  SESSION_PROFILE_REFRESHED_AT_KEY,
} from '../../config/constants.js';
import type { User } from '../../domain/users/user.model.js';

const REDIRECT_URI   = `${env.appUrl}${ROUTES.callback}`;
const PKCE_VERIFIER_KEY = 'pkce_admin_code_verifier';
const PROFILE_MAX_AGE   = 30 * 60 * 1000;

interface TokenResponse {
  access_token: string;
  expires_in:   number;
  token_type:   'Bearer';
}

function generateVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

async function generateChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data    = encoder.encode(verifier);
  const digest  = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(new Uint8Array(digest));
}

function base64urlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function fetchUserProfile(token: string): Promise<User> {
  const res = await fetch(`${env.authServiceUrl}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  const body: { data: any; status: string } = await res.json();
  const { data } = body;
  return {
    uid:            data.uid ?? data.id ?? '',
    email:          data.email ?? '',
    display_name:   data.display_name ?? `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim(),
    first_name:     data.first_name,
    last_name:      data.last_name,
    photo_url:      data.photo_url,
    email_verified: data.email_verified ?? false,
    disabled:       data.disabled ?? false,
    role:           data.role ?? 'admin',
  };
}

export const authClient = {
  async redirectToLogin(state?: string): Promise<void> {
    const verifier  = generateVerifier();
    const challenge = await generateChallenge(verifier);
    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    const admin_scopes = [
      "openid",
      "profile",
      "email",
      "users:read", 
      "users:write", 
      "users:delete", 
      "users:disable",
      "oauth:read",
      "oauth:write",
      "oauth:delete",
      "accounts:read",
      "accounts:write",
      "accounts:delete",
      "admins:read",
      "admins:write",
      "admins:delete",
      "system:read",
      "system:write"
    ]
    const params = new URLSearchParams({
      response_type:         'code',
      client_id:             env.clientId,
      redirect_uri:          REDIRECT_URI,
      scope:                 admin_scopes.join(' '),
      code_challenge:        challenge,
      code_challenge_method: 'S256',
      ...(state ? { state } : {}),
    });
    window.location.replace(`${env.authServiceUrl}/v1/o/authorize?${params}`);
  },

  async handleCallback(code: string): Promise<void> {
    const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
    if (!codeVerifier) throw new Error('PKCE code_verifier not found — restart the login flow');
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);

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

  async initSession(): Promise<void> {
    const token  = localStorage.getItem(SESSION_TOKEN_KEY);
    const expiry = Number(localStorage.getItem(SESSION_EXPIRY_KEY) || null);

    if (!token || !expiry) return;
    if (Date.now() > expiry) {
      sessionStore.destroy();
      return;
    }

    const lastRefreshed = Number(localStorage.getItem(SESSION_PROFILE_REFRESHED_AT_KEY)) || 0;
    if (Date.now() - lastRefreshed > PROFILE_MAX_AGE) {
      try {
        const user = await fetchUserProfile(token);
        sessionStore.updateUser(user);
        localStorage.setItem(SESSION_PROFILE_REFRESHED_AT_KEY, String(Date.now()));
      } catch {
        sessionStore.destroy();
      }
    }
  },

  logout(): void {
    sessionStore.destroy();
    const params = new URLSearchParams({
      client_id:    env.clientId,
      redirect_uri: `${env.appUrl}${ROUTES.login}`,
    });
    window.location.replace(`${env.authServiceUrl}/logout?${params}`);
  },
} as const;
