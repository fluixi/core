// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createStorage, StorageQuotaError } from '../index.js';
import { documentCookieAdapter } from './index.js';

const clearCookies = () => {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]!.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
};

describe('documentCookieAdapter', () => {
  beforeEach(clearCookies);

  it('reads and writes namespaced values through document.cookie', () => {
    const storage = createStorage<{ theme: string }>({ adapter: documentCookieAdapter({ secure: false }), namespace: 'ui' });
    storage.set('theme', 'dark');
    expect(document.cookie).toMatch(/ui%3Atheme=/);
    expect(storage.get('theme')).toBe('dark');
    expect(storage.keys()).toEqual(['theme']);
    storage.remove('theme');
    expect(storage.get('theme')).toBeNull();
  });

  it('reads what the server wrote with the same encoding', () => {
    document.cookie = 'ui%3Atheme=' + encodeURIComponent(JSON.stringify({ v: 1, value: 'light', createdAt: 1 })) + '; Path=/';
    expect(createStorage<{ theme: string }>({ adapter: documentCookieAdapter(), namespace: 'ui' }).get('theme')).toBe('light');
  });

  it('refuses a value over the size limit', () => {
    expect(() => documentCookieAdapter({ secure: false, maxSize: 8 }).set('k', 'x'.repeat(16))).toThrow(StorageQuotaError);
  });
});
