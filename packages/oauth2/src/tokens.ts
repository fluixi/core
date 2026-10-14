/**
 * The injection tokens an application provides and injects.
 *
 * Declared here so every app names the same thing, rather than each inventing a token
 * and losing the ability to share a component that injects one.
 *
 * `@fluixi/start/di` is an optional peer: it imports only `@fluixi/core` and
 * `@fluixi/dom`, so taking it is cheap, and an app that does not use dependency
 * injection never loads this module.
 */
import { injectionToken } from '@fluixi/di';
import type { AuthClient } from './types.js';
import type { AuthService } from './service.js';

/**
 * The application-facing service.
 *
 * No factory: a service needs configuration that only the app has, so it is provided
 * explicitly. Injecting it without providing it is an error that names this token,
 * which is the failure worth having.
 */
export const AuthServiceToken = injectionToken<AuthService<unknown>>('AuthService');

/** The protocol half, for code that drives the flow without needing the session. */
export const AuthClientToken = injectionToken<AuthClient>('AuthClient');
