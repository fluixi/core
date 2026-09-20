/**
 * Who is calling.
 *
 * Built by a factory from the request headers rather than read ambiently, so the same
 * service works under SSR, inside a server function, and in a test that passes a plain
 * `Request`.
 */
export interface AuthUser {
  readonly name: string;
  readonly roles: readonly string[];
  readonly anonymous: boolean;
}

export const ANONYMOUS: AuthUser = { name: 'anonymous', roles: [], anonymous: true };

/**
 * The demo scheme: `authorization: Bearer <name>:<role>,<role>`. A real desk would verify
 * a signed token here; what matters for the example is that the parsing happens once, in
 * one place, and everything downstream injects the result.
 */
export function userFromRequest(request: Request | undefined): AuthUser {
  const header = request?.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return ANONYMOUS;
  const [name, roles = ''] = token.split(':');
  if (!name) return ANONYMOUS;
  return {
    name,
    roles: roles.split(',').map((r) => r.trim()).filter(Boolean),
    anonymous: false,
  };
}

export function can(user: AuthUser, role: string): boolean {
  return user.roles.includes(role);
}
