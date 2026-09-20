/**
 * What the DI container is claimed to do, checked against this app's own service graph.
 *
 * The package has unit tests for the container in isolation. These run the desk's real
 * providers instead, because the claim that matters to an app is not "an injector
 * resolves a token" but "two users hitting the server at the same time cannot see each
 * other's tickets".
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  createInjector,
  inject,
  injectionToken,
  runInInjectionContext,
  type Provider,
} from '@fluixi/start/di';
import { fixedClock, systemClock } from '../src/services/clock.js';
import { userFromRequest, can, ANONYMOUS } from '../src/services/auth.js';
import { ConsoleLogger } from '../src/services/logger.js';
import { TicketRepo } from '../src/services/ticket-repo.js';
import { DraftStore } from '../src/services/draft-store.js';
import {
  AuthToken,
  ClockToken,
  LoggerToken,
  TicketReaderToken,
  TicketRepoToken,
} from '../src/services/tokens.js';

/**
 * The root provider list, but with the request supplied explicitly instead of read from
 * an ambient request event, so a test can stand up two "requests" side by side.
 */
function providersFor(request?: Request): Provider[] {
  return [
    { provide: ClockToken, useValue: fixedClock(1_700_000_000_000) },
    { provide: TicketRepoToken, useClass: TicketRepo, deps: [ClockToken, LoggerToken] },
    { provide: AuthToken, useFactory: () => userFromRequest(request) },
    { provide: TicketReaderToken, useExisting: TicketRepoToken },
  ];
}

const asBearer = (token: string) =>
  new Request('https://desk.test/tickets', {
    headers: { authorization: `Bearer ${token}` },
  });

describe('the desk resolves its own service graph', () => {
  it('builds a repository out of its declared deps', () => {
    const injector = createInjector(providersFor(), null);
    const repo = injector.get(TicketRepoToken);
    expect(repo).toBeInstanceOf(TicketRepo);
    expect(repo.list()).toHaveLength(3);
    // The fixed clock reached the repo through `deps`, rather than the repo calling
    // Date.now() itself.
    expect(repo.list()[0].createdAt).toBe(new Date(1_700_000_000_000).toISOString());
  });

  it('self-provides the logger from the token factory, with nothing registered for it', () => {
    const injector = createInjector(providersFor(), null);
    const logger = injector.get(LoggerToken);
    expect(logger).toBeInstanceOf(ConsoleLogger);
    // Constructing the repo logged through that same instance.
    injector.get(TicketRepoToken);
    expect(logger.lines.some((l) => l.includes('constructed'))).toBe(true);
  });

  it('useExisting is an alias, not a second instance', () => {
    const injector = createInjector(providersFor(), null);
    expect(injector.get(TicketReaderToken)).toBe(injector.get(TicketRepoToken));
  });

  it('builds the user from the request the factory was given', () => {
    const injector = createInjector(providersFor(asBearer('rita:agent,admin')), null);
    const user = injector.get(AuthToken);
    expect(user.name).toBe('rita');
    expect(can(user, 'admin')).toBe(true);
    expect(can(user, 'billing')).toBe(false);
  });

  it('falls back to anonymous with no authorization header', () => {
    const injector = createInjector(providersFor(new Request('https://desk.test/')), null);
    expect(injector.get(AuthToken)).toEqual(ANONYMOUS);
  });
});

describe('two concurrent requests do not share state', () => {
  it('gives each request its own repository', () => {
    const a = createInjector(providersFor(asBearer('rita:agent')), null);
    const b = createInjector(providersFor(asBearer('sam:agent')), null);

    const repoA = a.get(TicketRepoToken);
    const repoB = b.get(TicketRepoToken);

    expect(repoA.instanceId).not.toBe(repoB.instanceId);

    repoA.open('Only visible to rita', 'body', 'rita');

    // The whole point: B never sees A's ticket, and its id sequence did not continue
    // from A's.
    expect(repoA.list()).toHaveLength(4);
    expect(repoB.list()).toHaveLength(3);
    expect(repoB.list().map((t) => t.subject)).not.toContain('Only visible to rita');
  });

  it('keeps each request user separate', () => {
    const a = createInjector(providersFor(asBearer('rita:admin')), null);
    const b = createInjector(providersFor(asBearer('sam:agent')), null);
    expect(a.get(AuthToken).name).toBe('rita');
    expect(b.get(AuthToken).name).toBe('sam');
    expect(can(a.get(AuthToken), 'admin')).toBe(true);
    expect(can(b.get(AuthToken), 'admin')).toBe(false);
  });

  it('resolves a token once per injector, not once per call', () => {
    const injector = createInjector(providersFor(), null);
    expect(injector.get(TicketRepoToken)).toBe(injector.get(TicketRepoToken));
  });
});

describe('a child scope overrides without touching its parent', () => {
  it('shadows a token for the child only', () => {
    const parent = createInjector(providersFor(), null);
    const child = createInjector(
      [{ provide: ClockToken, useValue: fixedClock(0) }],
      parent,
    );

    expect(child.get(ClockToken).now()).toBe(0);
    expect(parent.get(ClockToken).now()).toBe(1_700_000_000_000);
    // Unshadowed tokens still come from the parent, as the same instance.
    expect(child.get(TicketRepoToken)).toBe(parent.get(TicketRepoToken));
  });
});

describe('component-scoped services are disposed', () => {
  beforeEach(() => {
    DraftStore.disposals = 0;
    DraftStore.live = 0;
  });

  it('runs onDestroy when the injector holding it disposes', () => {
    const DraftToken = injectionToken<DraftStore>('Draft');
    const injector = createInjector(
      [{ provide: DraftToken, useFactory: () => new DraftStore('T-001') }],
      null,
    );

    // Build it, so there is something to dispose.
    const draft = injector.get(DraftToken);
    draft.set('half-written reply');
    expect(DraftStore.live).toBe(1);
    expect(draft.text()).toBe('half-written reply');
    expect(draft.length).toBe(18);

    injector.dispose();

    expect(DraftStore.disposals).toBe(1);
    expect(DraftStore.live).toBe(0);
    expect(draft.text()).toBe('');
  });
});

describe('failure modes are reported, not swallowed', () => {
  it('names the token when nothing provides it', () => {
    const orphan = injectionToken<string>('NotProvided');
    const injector = createInjector([], null);
    expect(() => injector.get(orphan)).toThrow(/No provider for "NotProvided"/);
  });

  it('detects a cycle instead of overflowing the stack', () => {
    const A = injectionToken<unknown>('CycleA');
    const B = injectionToken<unknown>('CycleB');
    const injector = createInjector(
      [
        { provide: A, useFactory: (b: unknown) => ({ b }), deps: [B] },
        { provide: B, useFactory: (a: unknown) => ({ a }), deps: [A] },
      ],
      null,
    );
    expect(() => injector.get(A)).toThrow(/Circular dependency/);
  });
});

describe('server functions can run in an explicit injection context', () => {
  it('resolves from the injector it was handed', () => {
    const injector = createInjector(providersFor(asBearer('wei:agent')), null);
    // This is the shape a server function uses: no owner, no request context, just the
    // injector captured for this call.
    const name = runInInjectionContext(injector, () => inject(AuthToken).name);
    expect(name).toBe('wei');
  });
});

describe('the clock is a dependency, not a global', () => {
  it('the real clock still moves', () => {
    expect(systemClock.now()).toBeGreaterThan(1_700_000_000_000);
  });
});
