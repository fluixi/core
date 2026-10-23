import { describe, it, expect, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { memoryRateLimitStore, postgresRateLimitStore, type RateLimitStore } from './rate-limit.js';

const open: PGlite[] = [];
afterEach(async () => {
  for (const db of open.splice(0)) await db.close();
});
const pglite = () => {
  const db = new PGlite();
  open.push(db);
  return db;
};

// PGlite starts an in-process Postgres, which can take seconds on a busy CI runner.
const PGLITE_TIMEOUT = 30_000;

const stores: [string, () => RateLimitStore][] = [
  ['memory', () => memoryRateLimitStore()],
  ['postgres', () => postgresRateLimitStore(pglite())],
];

describe.each(stores)('%s rate-limit store', (_, make) => {
  it('allows the limit, then refuses until the window ends', async () => {
    const store = make();
    expect(await store.hit('a', 2, 60)).toMatchObject({ allowed: true, remaining: 1 });
    expect(await store.hit('a', 2, 60)).toMatchObject({ allowed: true, remaining: 0 });
    const refused = await store.hit('a', 2, 60);
    expect(refused.allowed).toBe(false);
    expect(refused.resetMs).toBeGreaterThan(55_000);
  });

  it('counts each key apart', async () => {
    const store = make();
    await store.hit('a', 1, 60);
    expect((await store.hit('b', 1, 60)).allowed).toBe(true);
  });

  it('starts again in a new window', async () => {
    const store = make();
    await store.hit('a', 1, 1);
    expect((await store.hit('a', 1, 1)).allowed).toBe(false);
    await new Promise((done) => setTimeout(done, 1100));
    expect((await store.hit('a', 1, 1)).allowed).toBe(true);
  });
}, PGLITE_TIMEOUT);

describe('postgres rate-limit store', () => {
  it('shares counts between instances on one database', async () => {
    const db = pglite();
    await postgresRateLimitStore(db).hit('a', 1, 60);
    expect((await postgresRateLimitStore(db).hit('a', 1, 60)).allowed).toBe(false);
  });

  it('writes to the table a migration made', async () => {
    const db = pglite();
    await db.exec('create table limits (key varchar(255) primary key, points integer not null default 0, expire bigint)');
    await postgresRateLimitStore(db, { table: 'limits', createTable: false }).hit('a', 5, 60);
    expect((await db.query('select points from limits')).rows).toEqual([{ points: 1 }]);
  });

  it('counts in memory while the database fails', async () => {
    const store = postgresRateLimitStore(pglite(), { table: 'missing', createTable: false });
    expect((await store.hit('a', 1, 60)).allowed).toBe(true);
    expect((await store.hit('a', 1, 60)).allowed).toBe(false);
  });
}, PGLITE_TIMEOUT);
