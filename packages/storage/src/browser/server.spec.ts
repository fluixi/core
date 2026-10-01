/** On a server: building the adapter is safe, using it says why it cannot work. */
import { describe, it, expect } from 'vitest';
import { createStorage, StorageUnavailableError } from '../index.js';
import { localStorageAdapter } from './index.js';

describe('localStorageAdapter without a browser', () => {
  it('can be created, and throws StorageUnavailableError when used', () => {
    expect(typeof (globalThis as { window?: unknown }).window).toBe('undefined');
    const storage = createStorage({ adapter: localStorageAdapter() });
    expect(() => storage.get('theme')).toThrow(StorageUnavailableError);
    expect(() => storage.set('theme', 'dark')).toThrow(StorageUnavailableError);
  });
});
