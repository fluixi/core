/**
 * Who the browser is signed in as.
 *
 * Deliberately not a DI service: the interceptor that reads it runs outside any owner or
 * request scope, at the moment a fetch leaves. Keeping it a plain module read avoids
 * pretending there is an injection context where there is none.
 *
 * The token is the demo credential the middleware and `userFromRequest` both parse:
 * `<name>:<role>,<role>`.
 */
const KEY = 'desk.token';

export function currentToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(KEY);
}

export function signIn(name: string, roles: readonly string[]): void {
  localStorage.setItem(KEY, `${name}:${roles.join(',')}`);
}

export function signOut(): void {
  localStorage.removeItem(KEY);
}
