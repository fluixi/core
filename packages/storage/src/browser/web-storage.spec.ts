// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStorage, StorageQuotaError, StorageSecurityError } from '../index.js';
import { localStorageAdapter, sessionStorageAdapter } from './index.js';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('localStorageAdapter', () => {
  it('stores through window.localStorage, namespaced, with expiry', () => {
    let time = 0;
    const storage = createStorage<{ theme: string; token: string }>({ adapter: localStorageAdapter(), namespace: 'app', now: () => time });
    storage.set('theme', 'dark');
    storage.set('token', 't', { ttl: 10 });
    expect(JSON.parse(localStorage.getItem('app:theme')!).value).toBe('dark');
    expect(storage.keys().sort()).toEqual(['theme', 'token']);
    time = 20;
    expect(storage.get('token')).toBeNull();
    expect(localStorage.getItem('app:token')).toBeNull();
    expect(storage.capabilities).toMatchObject({ persistent: true, reactive: true, crossContext: true });
  });

  it('reports a write from another tab, in its own namespace only', () => {
    const storage = createStorage({ adapter: localStorageAdapter(), namespace: 'app' });
    const events: unknown[] = [];
    storage.subscribe((e) => events.push([e.type, e.key, e.value, e.external]));
    const value = JSON.stringify({ v: 1, value: 'light', createdAt: 1 });
    window.dispatchEvent(new StorageEvent('storage', { key: 'app:theme', newValue: value, storageArea: localStorage }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'other:theme', newValue: value, storageArea: localStorage }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'app:theme', newValue: null, storageArea: localStorage }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'app:theme', newValue: value, storageArea: sessionStorage }));
    expect(events).toEqual([
      ['set', 'theme', 'light', true],
      ['remove', 'theme', undefined, true],
    ]);
  });

  it('turns the browser\'s quota and security exceptions into storage errors', () => {
    const adapter = localStorageAdapter();
    const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(() => adapter.set('big', 'x')).toThrow(StorageQuotaError);
    quota.mockRestore();
    const blocked = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(() => adapter.get('k')).toThrow(StorageSecurityError);
    blocked.mockRestore();
  });
});

describe('sessionStorageAdapter', () => {
  it('stores in sessionStorage, apart from localStorage', () => {
    const storage = createStorage({ adapter: sessionStorageAdapter() });
    storage.set('draft', 'x');
    expect(sessionStorage.getItem('draft')).not.toBeNull();
    expect(localStorage.getItem('draft')).toBeNull();
    expect(storage.scope).toBe('session');
    expect(storage.capabilities.crossContext).toBe(false);
  });
});
