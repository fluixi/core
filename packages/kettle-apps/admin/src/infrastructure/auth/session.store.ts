import { createSignal, createMemo, createContext, useContext, batch } from '@awc/kettlejs';
import {
  SESSION_TOKEN_KEY,
  SESSION_EXPIRY_KEY,
  SESSION_USER_KEY,
  SESSION_PROFILE_REFRESHED_AT_KEY,
} from '../../config/constants.js';
import type { User } from '../../domain/users/user.model.js';

const [_token,  _setToken]  = createSignal<string | null>(
  localStorage.getItem(SESSION_TOKEN_KEY),
);
const [_expiry, _setExpiry] = createSignal<number | null>(
  Number(localStorage.getItem(SESSION_EXPIRY_KEY)) || null,
);
const [_user, _setUser] = createSignal<User | null>(
  JSON.parse(localStorage.getItem(SESSION_USER_KEY) ?? 'null'),
);

const _isExpired = createMemo(() => {
  const exp = _expiry();
  return exp !== null && Date.now() > exp;
});

export const sessionStore = {
  token:           _token,
  user:            _user,
  isAuthenticated: createMemo(() => _token() !== null && !_isExpired()),

  establish(token: string, expiresIn: number, user: User): void {
    const expiry = Date.now() + expiresIn * 1000;
    localStorage.setItem(SESSION_TOKEN_KEY,  token);
    localStorage.setItem(SESSION_EXPIRY_KEY, String(expiry));
    localStorage.setItem(SESSION_USER_KEY,   JSON.stringify(user));
    batch(() => {
      _setToken(token);
      _setExpiry(expiry);
      _setUser(user);
    });
  },

  updateUser(user: User): void {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    _setUser(user);
  },

  destroy(): void {
    // alert('destroyin session')
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    localStorage.removeItem(SESSION_USER_KEY);
    localStorage.removeItem(SESSION_PROFILE_REFRESHED_AT_KEY);
    batch(() => {
      _setToken(null);
      _setExpiry(null);
      _setUser(null);
    });
  },
} as const;

export type SessionState = typeof sessionStore;
export const SessionContext = createContext<SessionState>();

export function useSession(): SessionState | null {
  return useContext(SessionContext);
}
