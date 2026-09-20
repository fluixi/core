// /api/tickets — the collection. GET lists, POST opens.
//
// The handlers resolve their dependencies through the injector rather than importing a
// module-level store, so an API call and an SSR render in the same request see the same
// repository, and two concurrent requests do not.
import { inject } from '@fluixi/start/di';
import { can, userFromRequest } from '../services/auth.js';
import { TicketRepoToken } from '../services/tokens.js';
import type { TicketStatus } from '../services/ticket-repo.js';

export function GET(request: Request) {
  const status = new URL(request.url).searchParams.get('status') as TicketStatus | null;
  const repo = inject(TicketRepoToken);
  return { tickets: repo.list(status ?? undefined), servedBy: repo.instanceId };
}

export async function POST(request: Request) {
  // Resolved before the first `await`. An injection context is synchronous: it is
  // restored the moment the calling frame returns, so a dependency pulled in after an
  // await has no context to resolve from.
  const repo = inject(TicketRepoToken);
  const user = userFromRequest(request);
  if (!can(user, 'agent')) {
    return new Response(JSON.stringify({ error: 'agent role required' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }
  const body = (await request.json().catch(() => ({}))) as {
    subject?: string;
    body?: string;
  };
  if (!body.subject) {
    return new Response(JSON.stringify({ error: 'subject is required' }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
    });
  }
  const ticket = repo.open(body.subject, body.body ?? '', user.name);
  return new Response(JSON.stringify(ticket), {
    status: 201,
    headers: { 'content-type': 'application/json', location: `/api/tickets/${ticket.id}` },
  });
}
