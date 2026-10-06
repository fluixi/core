// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createBrowserHistory, createMemoryHistory } from './history.js';

describe('history entries', () => {
  it('names each entry and says how it was reached, the same key when back returns to it', () => {
    const h = createMemoryHistory('/a');
    const first = h.get();
    expect(first.action).toBe('pop');
    h.push('/b');
    expect(h.get()).toMatchObject({ pathname: '/b', action: 'push' });
    expect(h.get().key).not.toBe(first.key);
    h.go(-1);
    expect(h.get()).toMatchObject({ pathname: '/a', action: 'pop', key: first.key });
    h.replace('/a?x=1');
    expect(h.get().action).toBe('replace');
  });

  describe('in the browser', () => {
    beforeEach(() => history.replaceState({ from: 'app' }, '', '/start'));

    it('keeps the key beside the app state and hands the app its own state', () => {
      const h = createBrowserHistory();
      expect(h.window).toBe(true);
      const first = h.get();
      expect(first.state).toEqual({ from: 'app' });
      expect(h.get().key).toBe(first.key);
      h.push('/next', { n: 1 });
      expect(h.get()).toMatchObject({ pathname: '/next', state: { n: 1 }, action: 'push' });
      expect(h.get().key).not.toBe(first.key);
    });
  });
});
