// /api/tickets/:id — one ticket. The `[id]` in the filename becomes `params.id`.
import { inject } from '@fluixi/start/di';
import { can, userFromRequest } from '../../services/auth.js';
import { TicketRepoToken } from '../../services/tokens.js';
import type { TicketStatus } from '../../services/ticket-repo.js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export function GET(_request: Request, { params }: { params: { id: string } }) {
  const ticket = inject(TicketRepoToken).get(params.id);
  return ticket ? ticket : json({ error: 'no such ticket' }, 404);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  // Before the await, for the same reason as the POST in ../tickets.ts.
  const repo = inject(TicketRepoToken);
  if (!can(userFromRequest(request), 'agent')) return json({ error: 'agent role required' }, 403);
  const body = (await request.json().catch(() => ({}))) as { status?: TicketStatus };
  if (!body.status) return json({ error: 'status is required' }, 422);
  const updated = repo.setStatus(params.id, body.status);
  return updated ? updated : json({ error: 'no such ticket' }, 404);
}

export function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!can(userFromRequest(request), 'admin')) return json({ error: 'admin role required' }, 403);
  return inject(TicketRepoToken).remove(params.id)
    ? new Response(null, { status: 204 })
    : json({ error: 'no such ticket' }, 404);
}
