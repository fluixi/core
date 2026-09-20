/**
 * Every injection token the desk uses, in one file.
 *
 * Tokens live apart from the implementations so a route can depend on `TicketRepo`
 * without importing the class that satisfies it. That is the part of DI that pays for
 * itself here: the request-scoped repository below is swapped for an in-memory double in
 * `tests/`, and nothing in the routes changes.
 */
import { injectionToken } from '@fluixi/start/di';
import { ConsoleLogger, type Logger } from './logger.js';
import type { AuthUser } from './auth.js';
import type { Clock } from './clock.js';
import type { TicketRepo } from './ticket-repo.js';

/**
 * Self-providing: the token carries its own factory, so nothing has to register a logger
 * for `inject(LoggerToken)` to work. An app that never injects it drops the
 * implementation at bundle time.
 */
export const LoggerToken = injectionToken<Logger>('Logger', {
  factory: () => new ConsoleLogger(),
});

/** Time as a dependency, so a test can assert on a fixed clock instead of `Date.now()`. */
export const ClockToken = injectionToken<Clock>('Clock');

/**
 * The id of the request being served. Provided per request by the server entry, which is
 * what makes it useful as proof: two concurrent renders must never see the same value.
 */
export const RequestIdToken = injectionToken<string>('RequestId');

/** Who is calling, resolved from the request headers by the middleware. */
export const AuthToken = injectionToken<AuthUser>('Auth');

/** Ticket storage. Root-provided, so it is per-request on the server. */
export const TicketRepoToken = injectionToken<TicketRepo>('TicketRepo');

/**
 * An alias, resolved with `useExisting`. The read-only half of the repository is a
 * separate token so a component that only lists tickets cannot reach the write methods
 * by accident.
 */
export const TicketReaderToken = injectionToken<Pick<TicketRepo, 'list' | 'get'>>(
  'TicketReader',
);
