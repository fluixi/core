/**
 * The root provider set, in one list.
 *
 * All four provider kinds are here because the desk genuinely needs each of them, not to
 * tick them off: a constant clock (`useValue`), a repository assembled from other
 * services (`useClass` with `deps`), a user parsed out of the live request
 * (`useFactory`), and a narrowed read-only alias (`useExisting`).
 *
 * Registered from the server entry on every request and once on the client. On the
 * server the root injector belongs to the request, so `useClass`/`useFactory` run again
 * per request and nothing here is shared between two users.
 */
import type { Provider } from '@fluixi/start/di';
import { getRequestEvent } from '@fluixi/server';
import { systemClock } from './clock.js';
import { userFromRequest } from './auth.js';
import { TicketRepo } from './ticket-repo.js';
import {
  AuthToken,
  ClockToken,
  LoggerToken,
  TicketReaderToken,
  TicketRepoToken,
} from './tokens.js';

export function rootProviders(): Provider[] {
  return [
    { provide: ClockToken, useValue: systemClock },

    // deps resolve from wherever the provider lives, so the repo gets this request's
    // clock and this request's logger.
    {
      provide: TicketRepoToken,
      useClass: TicketRepo,
      deps: [ClockToken, LoggerToken],
    },

    // Reads the request that is being served right now. On the client there is no
    // request event and this falls back to anonymous.
    {
      provide: AuthToken,
      useFactory: () => userFromRequest(getRequestEvent()?.request as Request | undefined),
    },

    // Same instance as TicketRepoToken, exposed under a type that has no write methods.
    { provide: TicketReaderToken, useExisting: TicketRepoToken },
  ];
}
