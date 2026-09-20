/**
 * The file-based API routes, dispatched the way the server dispatches them.
 *
 * `handleApi` does the matching, so these cover the real path from a URL to a handler,
 * including the `[id]` parameter and the verb dispatch, not just the exported functions
 * called directly.
 *
 * Each case builds a fresh injector and runs inside it, which is what the server does
 * per request. That is also what makes the isolation assertion at the bottom meaningful.
 */
import { describe, expect, it } from 'vitest';
import { derivePattern, handleApi, type ApiRoute } from '@fluixi/start/api';
import { createInjector, runInInjectionContext, type Provider } from '@fluixi/start/di';
import { fixedClock } from '../src/services/clock.js';
import { TicketRepo } from '../src/services/ticket-repo.js';
import {
  ClockToken,
  LoggerToken,
  TicketReaderToken,
  TicketRepoToken,
} from '../src/services/tokens.js';

import * as health from '../src/api/health.js';
import * as whoami from '../src/api/whoami.js';
import * as tickets from '../src/api/tickets.js';
import * as ticketById from '../src/api/tickets/[id].js';

/**
 * Built the same way the build builds them: from the path of the file under `src/api`
 * with its extension already stripped, so `[id]` produces the capture group rather than
 * a hand-written pattern that could disagree with what ships.
 */
const route = (rel: string, mod: object): ApiRoute => ({
  ...derivePattern(rel, '/api'),
  mod: mod as Record<string, unknown>,
});

const routes: ApiRoute[] = [
  route('health', health),
  route('whoami', whoami),
  route('tickets', tickets),
  route('tickets/[id]', ticketById),
];

const providers = (): Provider[] => [
  { provide: ClockToken, useValue: fixedClock(1_700_000_000_000) },
  { provide: TicketRepoToken, useClass: TicketRepo, deps: [ClockToken, LoggerToken] },
  { provide: TicketReaderToken, useExisting: TicketRepoToken },
];

/** One request, in its own injector, like one server request. */
function call(
  path: string,
  init?: RequestInit & { as?: string },
  injector = createInjector(providers(), null),
) {
  const { as, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (as) headers.set('authorization', `Bearer ${as}`);
  const request = new Request(`https://desk.test${path}`, { ...rest, headers });
  return runInInjectionContext(injector, () => handleApi(routes, request, '/api'));
}

const body = async (res: Response) => res.json();

describe('routes that need nothing', () => {
  it('answers the health probe', async () => {
    const res = await call('/api/health');
    expect(res.status).toBe(200);
    expect(await body(res)).toMatchObject({ ok: true });
  });

  it('404s an unknown path under the prefix', async () => {
    const res = await call('/api/nope');
    expect(res.status).toBe(404);
  });
});

describe('the collection', () => {
  it('lists the seeded tickets', async () => {
    const res = await call('/api/tickets');
    const json = await body(res);
    expect(json.tickets).toHaveLength(3);
    expect(json.servedBy).toMatch(/^repo-/);
  });

  it('filters by status from the query string', async () => {
    const res = await call('/api/tickets?status=closed');
    expect((await body(res)).tickets).toHaveLength(1);
  });

  it('refuses a POST without the agent role', async () => {
    const res = await call('/api/tickets', {
      method: 'POST',
      as: 'wei:',
      body: JSON.stringify({ subject: 'nope' }),
    });
    expect(res.status).toBe(403);
  });

  it('rejects a POST with no subject', async () => {
    const res = await call('/api/tickets', {
      method: 'POST',
      as: 'rita:agent',
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it('creates a ticket for an agent and points at it', async () => {
    const res = await call('/api/tickets', {
      method: 'POST',
      as: 'rita:agent',
      body: JSON.stringify({ subject: 'Disk full on the build box' }),
    });
    expect(res.status).toBe(201);
    const created = await body(res);
    expect(created.id).toBe('T-004');
    expect(created.author).toBe('rita');
    expect(res.headers.get('location')).toBe('/api/tickets/T-004');
  });
});

describe('a single ticket', () => {
  it('resolves the [id] parameter', async () => {
    const res = await call('/api/tickets/T-002');
    expect((await body(res)).subject).toContain('SSO redirect');
  });

  it('404s an id that does not exist', async () => {
    const res = await call('/api/tickets/T-999');
    expect(res.status).toBe(404);
  });

  it('PATCHes a status as an agent', async () => {
    const res = await call('/api/tickets/T-001', {
      method: 'PATCH',
      as: 'sam:agent',
      body: JSON.stringify({ status: 'closed' }),
    });
    expect(res.status).toBe(200);
    expect((await body(res)).status).toBe('closed');
  });

  it('refuses a PATCH without the role', async () => {
    const res = await call('/api/tickets/T-001', {
      method: 'PATCH',
      as: 'wei:',
      body: JSON.stringify({ status: 'closed' }),
    });
    expect(res.status).toBe(403);
  });

  it('DELETE needs admin, not merely agent', async () => {
    const asAgent = await call('/api/tickets/T-003', { method: 'DELETE', as: 'sam:agent' });
    expect(asAgent.status).toBe(403);

    const asAdmin = await call('/api/tickets/T-003', {
      method: 'DELETE',
      as: 'rita:agent,admin',
    });
    expect(asAdmin.status).toBe(204);
  });

  it('405s a verb the route does not export', async () => {
    const res = await call('/api/health', { method: 'DELETE' });
    expect(res.status).toBe(405);
  });
});

describe('who the request is', () => {
  it('reports the parsed identity', async () => {
    const res = await call('/api/whoami', { as: 'rita:agent,admin' });
    expect(await body(res)).toMatchObject({
      name: 'rita',
      roles: ['agent', 'admin'],
      anonymous: false,
    });
  });

  it('reports anonymous with no header', async () => {
    expect(await body(await call('/api/whoami'))).toMatchObject({ anonymous: true });
  });
});

describe('one request cannot see another request', () => {
  it('a ticket created in one injector is absent from the next', async () => {
    const first = createInjector(providers(), null);
    await call('/api/tickets', {
      method: 'POST',
      as: 'rita:agent',
      body: JSON.stringify({ subject: 'Only in the first request' }),
    }, first);

    const inFirst = await body(await call('/api/tickets', {}, first));
    expect(inFirst.tickets).toHaveLength(4);

    // A new injector is a new request.
    const second = await body(await call('/api/tickets'));
    expect(second.tickets).toHaveLength(3);
    expect(second.servedBy).not.toBe(inFirst.servedBy);
  });
});
