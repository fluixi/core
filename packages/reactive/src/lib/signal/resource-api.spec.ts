/** `resource` is `createResource` in one binding, so the tests hold it to that. */
import { describe, it, expect } from 'vitest';
import { resource } from './resource-api.js';
import { signal } from './api.js';

const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

describe('resource', () => {
  it('reads the value with get(), like a signal', async () => {
    const user = resource(async () => ({ name: 'Ada' }));
    await settle();
    expect(user()).toEqual({ name: 'Ada' });
  });

  it('exposes the metadata the accessor carries', async () => {
    const user = resource<{ name: string }>(async () => ({ name: 'Ada' }));
    expect(user.loading).toBe(true);

    await settle();
    expect(user.loading).toBe(false);
    expect(user.error).toBeUndefined();
    expect(user.latest).toEqual({ name: 'Ada' });
  });

  it('reads the metadata live, not as it was at construction', async () => {
    // The getters delegate; copying the values would freeze `loading` at true.
    const user = resource(async () => 1);
    const first = user.loading;
    await settle();
    expect([first, user.loading]).toEqual([true, false]);
  });

  it('refetches when the source changes', async () => {
    const id = signal(1);
    const seen: number[] = [];
    const user = resource(id, async (n: number) => (seen.push(n), n * 10));
    await settle();
    expect(user()).toBe(10);

    id.set(2);
    await settle();
    expect(seen).toEqual([1, 2]);
    expect(user()).toBe(20);
  });

  it('folds in the actions the tuple kept separate', async () => {
    const user = resource(async () => 1);
    await settle();
    expect(typeof user.refetch).toBe('function');

    user.mutate(99);
    expect(user()).toBe(99);
  });

  it('is the accessor createResource returns, with the actions on it', async () => {
    const handle = resource(async () => 1);
    expect(typeof handle).toBe('function');
    expect(typeof handle.refetch).toBe('function');
  });
});
