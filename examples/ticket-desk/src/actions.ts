/**
 * Server functions: the bodies run on the server, the client calls them over RPC.
 *
 * Each one injects rather than importing a shared instance. That is what keeps them
 * honest under concurrency — `inject(TicketRepoToken)` inside a server function resolves
 * from the root injector of *this* request, so two users calling `openTicket` at the
 * same moment write to two different repositories.
 *
 * The `'use server'` directive is what moves the body across the wire; everything above
 * it is ordinary module code that also runs on the client.
 */
import { inject } from '@fluixi/start/di';
import { getRequestEvent } from '@fluixi/server';
import { can } from './services/auth.js';
import { requestIdFor } from './services/request-id.js';
import { AuthToken, LoggerToken, TicketRepoToken } from './services/tokens.js';
import type { Ticket, TicketStatus } from './services/ticket-repo.js';

export interface DeskSnapshot {
  tickets: Ticket[];
  /** Who the server thinks is calling. */
  viewer: string;
  /** The id the middleware minted for this request. */
  requestId: string;
  /** Which repository instance served this call — different per request on the server. */
  servedBy: string;
}

/** Everything the desk page needs, in one round trip. */
export const loadDesk = async (): Promise<DeskSnapshot> => {
  'use server';
  const repo = inject(TicketRepoToken);
  const viewer = inject(AuthToken);
  const request = getRequestEvent()?.request as Request | undefined;
  return {
    tickets: repo.list(),
    viewer: viewer.name,
    requestId: requestIdFor(request) ?? 'none',
    servedBy: repo.instanceId,
  };
};

/** Open a ticket as the caller. Rejects an anonymous caller server-side. */
export const openTicket = async (data: {
  subject?: string;
  body?: string;
}): Promise<DeskSnapshot> => {
  'use server';
  const viewer = inject(AuthToken);
  if (viewer.anonymous) {
    throw new Error('Sign in to open a ticket.');
  }
  const subject = (data?.subject ?? '').toString().trim();
  if (!subject) throw new Error('A ticket needs a subject.');

  const repo = inject(TicketRepoToken);
  repo.open(subject, (data?.body ?? '').toString(), viewer.name);
  return loadDesk();
};

/**
 * Change a ticket's status. Only an agent may do this, and the check is here rather than
 * in the component, because the component is the part an attacker skips.
 */
export const setTicketStatus = async (data: {
  id?: string;
  status?: TicketStatus;
}): Promise<DeskSnapshot> => {
  'use server';
  const viewer = inject(AuthToken);
  if (!can(viewer, 'agent')) {
    throw new Error('Only an agent can change a ticket status.');
  }
  const repo = inject(TicketRepoToken);
  const log = inject(LoggerToken);
  if (data?.id && data?.status) {
    const updated = repo.setStatus(data.id, data.status);
    if (!updated) log.info(`status change for unknown ticket ${data.id}`);
  }
  return loadDesk();
};
