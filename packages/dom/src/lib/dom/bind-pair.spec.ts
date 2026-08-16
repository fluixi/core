// @vitest-environment jsdom
/**
 * `bind:` has to take a signal written either way, since they are the same primitive.
 */
import { describe, it, expect } from 'vitest';
import { createSignal, signal } from '@fluixi/reactive/signal';
import { bindPair } from './runtime.js';

describe('bindPair', () => {
  it('takes the tuple createSignal returns', () => {
    const [read, write] = bindPair(createSignal('a'));
    expect(read()).toBe('a');
    write('b');
    expect(read()).toBe('b');
  });

  it('takes what signal returns', () => {
    const [read, write] = bindPair(signal('a'));
    expect(read()).toBe('a');
    write('b');
    expect(read()).toBe('b');
  });

  it('gives both forms the same pair', () => {
    const fromTuple = bindPair(createSignal(1));
    const fromHandle = bindPair(signal(1));
    expect(fromTuple.map((f) => typeof f)).toEqual(fromHandle.map((f) => typeof f));
  });

  it('says what it wanted when handed something else', () => {
    expect(() => bindPair(42 as never)).toThrow(/needs a signal/);
    expect(() => bindPair({ set: 1 } as never)).toThrow(/needs a signal/);
  });
});
