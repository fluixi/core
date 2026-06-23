/**
 * Shared types for the Fluixi ↔ Better Auth bindings.
 *
 * We consume Better Auth through STRUCTURAL interfaces (the minimal shape we call), so
 * `@fluixi/auth` never hard-imports `better-auth` — it stays a peer the app owns, and the
 * bindings tree-shake cleanly. An app's real `betterAuth(...)` instance / `createAuthClient(...)`
 * structurally satisfy `BetterAuthServer` / `BetterAuthClient`.
 */

/** Where middleware stashes the resolved session on the request locals. */
export const AUTH_LOCALS_KEY = 'auth';

/** Default-ish user shape; apps supply their own via the generic `U`. */
export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthSession {
  id?: string;
  expiresAt?: string | number | Date;
  [key: string]: unknown;
}

/** The resolved auth state for a request — what lives on `locals.auth`. */
export interface SessionData<U = AuthUser> {
  user: U | null;
  session: AuthSession | null;
}

/** Minimal shape of a Better Auth server instance we call. */
export interface BetterAuthServer {
  /** Mounts at `/api/auth/*` — handles sign-in/up/out, OAuth callbacks, etc. */
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession: (ctx: { headers: Headers }) => Promise<{ user: unknown; session: unknown } | null>;
  };
}

/** Minimal shape of a Better Auth client we call (framework-agnostic vanilla client). */
export interface BetterAuthClient {
  getSession: () => Promise<{ data: { user: unknown; session: unknown } | null }>;
  signIn: {
    email: (input: { email: string; password: string; rememberMe?: boolean }) => Promise<unknown>;
  };
  signOut: () => Promise<unknown>;
}

declare module '@fluixi/dom' {
  interface RequestLocals {
    auth?: SessionData;
  }
}
