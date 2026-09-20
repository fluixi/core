/**
 * Ticket storage, with dependencies, holding reactive state.
 *
 * Two things are being shown at once here, and they interact.
 *
 * The first is scope: this service is registered at the root, which on the server means
 * **per request**. `instanceId` differs between two concurrent renders and the `seq`
 * counter never continues from another user's request. A singleton would be a
 * cross-request data leak, which is what `tests/di.spec.ts` checks.
 *
 * The second is reactivity. The tickets live in a `store`, not a plain `Map`, because a
 * component that calls `list()` or `get(id)` has to re-render when `setStatus` runs. A
 * plain collection read inside a component subscribes to nothing: the first render would
 * be correct and every update after it invisible. Reading through the store proxy
 * subscribes at key granularity, so flipping one ticket's status re-renders the rows
 * bound to that ticket and leaves the rest alone.
 *
 * Dependencies arrive as constructor arguments (`deps` on the provider) rather than via
 * `inject()` in the body, so the class can also be built by hand in a test with no
 * injector at all.
 */
import { store, type StoreHandle } from '@fluixi/reactive/store';
import type { Clock } from './clock.js';
import type { Logger } from './logger.js';

export type TicketStatus = 'open' | 'pending' | 'closed';

export interface Ticket {
  id: string;
  subject: string;
  body: string;
  status: TicketStatus;
  author: string;
  createdAt: string;
  /** Agent-only. Redacted out of the SSR payload by the server entry. */
  internalNote?: string;
}

interface DeskState {
  tickets: Ticket[];
}

let instances = 0;

export class TicketRepo {
  /** Distinct per constructed instance — the evidence of request isolation. */
  readonly instanceId = `repo-${++instances}`;

  /** Not reactive on purpose: an id counter is never rendered. */
  #seq = 0;

  readonly #state: StoreHandle<DeskState>;

  constructor(
    private readonly clock: Clock,
    private readonly log: Logger,
  ) {
    this.#state = store<DeskState>({ tickets: [] });
    this.log.info(`TicketRepo ${this.instanceId} constructed`);
    for (const seed of SEED) {
      this.#append(seed.subject, seed.body, seed.author, seed.status, seed.internalNote);
    }
  }

  #append(
    subject: string,
    body: string,
    author: string,
    status: TicketStatus,
    internalNote?: string,
  ): Ticket {
    const ticket: Ticket = {
      id: `T-${String(++this.#seq).padStart(3, '0')}`,
      subject,
      body,
      status,
      author,
      createdAt: this.clock.iso(),
      internalNote,
    };
    // A function at the path, so the append is one write against the current value.
    this.#state.set('tickets', (current: Ticket[]) => [...current, ticket]);
    return ticket;
  }

  /**
   * The current tickets. Reading this inside a component or memo subscribes to the
   * list, so an insertion or removal re-runs the caller.
   */
  list(status?: TicketStatus): Ticket[] {
    const all = this.#state.tickets;
    return status ? all.filter((t) => t.status === status) : [...all];
  }

  /** One ticket, tracked. A component bound to it re-renders when its fields change. */
  get(id: string): Ticket | undefined {
    return this.#state.tickets.find((t) => t.id === id);
  }

  open(subject: string, body: string, author: string): Ticket {
    const ticket = this.#append(subject, body, author, 'open');
    this.log.info(`opened ${ticket.id} for ${author}`);
    return ticket;
  }

  /** Writes through the store, so every reader of this ticket updates. */
  setStatus(id: string, status: TicketStatus): Ticket | undefined {
    const index = this.#state.tickets.findIndex((t) => t.id === id);
    if (index < 0) return undefined;

    // A step per argument: the list, the element, the field. Only this ticket's
    // `status` signal is poked, so the rows either side of it do not re-render.
    this.#state.set('tickets', index, 'status', status);
    this.log.info(`${id} -> ${status}`);
    return this.get(id);
  }

  remove(id: string): boolean {
    const before = this.#state.tickets.length;
    this.#state.set('tickets', (current: Ticket[]) => current.filter((t) => t.id !== id));
    return this.#state.tickets.length < before;
  }

  /** How many tickets this instance has created, including the seed. */
  get created(): number {
    return this.#seq;
  }
}

const SEED: ReadonlyArray<{
  subject: string;
  body: string;
  author: string;
  status: TicketStatus;
  internalNote?: string;
}> = [
  {
    subject: 'Export runs out of memory on large accounts',
    body: 'The CSV export dies above roughly 200k rows.',
    author: 'rita',
    status: 'open',
    internalNote: 'Probably the streaming path; assign to the platform team.',
  },
  {
    subject: 'SSO redirect loops on first login',
    body: 'Only for accounts created before the migration.',
    author: 'sam',
    status: 'pending',
    internalNote: 'Waiting on the identity vendor.',
  },
  {
    subject: 'Typo on the billing page',
    body: 'Says "montly".',
    author: 'wei',
    status: 'closed',
  },
];
