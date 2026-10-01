import { describe, it, expect, expectTypeOf, beforeAll } from 'vitest';
import {
  createStorage,
  createAsyncStorage,
  memoryStorage,
  generateEncryptionKey,
  importEncryptionKey,
  staticKeyProvider,
  StorageDecryptionError,
  StorageEncryptedPayloadError,
  StorageEncryptionAlgorithmError,
  StorageEncryptionError,
  StorageEncryptionKeyError,
  StorageEncryptionMetadataError,
  StorageEncryptionUnavailableError,
  StorageEncryptionVersionError,
  type AsyncTypedStorage,
  type EncryptionKeyProvider,
  type StorageAdapter,
  type TypedStorage,
} from '../index.js';

type Schema = { theme: string; language: string; session: { user: string; token: string }; data: number[] };
const session = { user: 'ada', token: 'secret-token' };

let key: CryptoKey;
beforeAll(async () => {
  key = await generateEncryptionKey();
});

const setup = (adapter: StorageAdapter = memoryStorage()) => ({
  adapter,
  storage: createStorage<Schema>({ adapter, encryption: { keyProvider: staticKeyProvider(key) } }),
});
const raw = (adapter: StorageAdapter, k: string) => JSON.parse(adapter.get(k)!);

describe('per-item encryption', () => {
  it('keeps encrypted and plain entries side by side and reads both back transparently', async () => {
    const { adapter, storage } = setup();
    await storage.set('theme', 'dark');
    await storage.set('language', 'en', { encrypt: false });
    await storage.set('session', session, { encrypt: true });
    expect(await storage.get('theme')).toBe('dark');
    expect(await storage.get('language')).toBe('en');
    expect(await storage.get('session')).toEqual(session);
    expect(raw(adapter, 'theme').value).toBe('dark');
    expect(adapter.get('session')).not.toContain('secret-token');
    expect(raw(adapter, 'session').enc).toMatchObject({ v: 1, alg: 'AES-256-GCM' });
    expect((await storage.getEntry('session'))?.encrypted).toBe(true);
    expect((await storage.getEntry('theme'))?.encrypted).toBeUndefined();
  });

  it('draws a fresh IV for every write', async () => {
    const { adapter, storage } = setup();
    await storage.set('session', session, { encrypt: true });
    const first = raw(adapter, 'session').enc;
    await storage.set('session', session, { encrypt: true });
    const second = raw(adapter, 'session').enc;
    expect(first.iv).not.toBe(second.iv);
    expect(first.data).not.toBe(second.data);
  });

  it('switches an entry between plain and encrypted on set, leaving nothing of the old form', async () => {
    const { adapter, storage } = setup();
    await storage.set('data', [1, 2]);
    await storage.set('data', [1, 2], { encrypt: true });
    expect(raw(adapter, 'data')).not.toHaveProperty('value');
    expect(await storage.get('data')).toEqual([1, 2]);
    await storage.set('data', [3], { encrypt: false });
    expect(raw(adapter, 'data')).not.toHaveProperty('enc');
    expect(await storage.get('data')).toEqual([3]);
  });

  it('removes and clears encrypted entries like any other', async () => {
    const { adapter, storage } = setup();
    await storage.set('session', session, { encrypt: true });
    await storage.set('theme', 'dark');
    await storage.remove('session');
    expect(await storage.has('session')).toBe(false);
    await storage.clear();
    expect(adapter.keys()).toEqual([]);
  });

  it('keeps encryption through update, touch and migrations', async () => {
    let t = 1000;
    const adapter = memoryStorage();
    const make = (migrations?: object) =>
      createStorage<Schema>({ adapter, now: () => t, migrations: migrations as never, encryption: { keyProvider: staticKeyProvider(key) } });
    const storage = make();
    await storage.set('data', [1], { encrypt: true, ttl: 100 });
    await storage.update('data', (v) => [...(v ?? []), 2]);
    expect(raw(adapter, 'data').enc).toBeDefined();
    expect(raw(adapter, 'data').expiresAt).toBe(1100);
    expect(await storage.touch('data', 500)).toBe(true);
    t = 1200;
    expect(await storage.get('data')).toEqual([1, 2]);
    const migrated = make({ data: { 1: (v: number[]) => v.map((n) => n * 10) } });
    expect(await migrated.get('data')).toEqual([10, 20]);
    expect(raw(adapter, 'data')).toMatchObject({ version: 1 });
    expect(raw(adapter, 'data').enc).toBeDefined();
  });

  it('expires and prunes encrypted entries without the key', async () => {
    let t = 0;
    const adapter = memoryStorage();
    await createStorage<Schema>({ adapter, now: () => t, encryption: { keyProvider: staticKeyProvider(key) } }).set('session', session, { encrypt: true, ttl: 10 });
    t = 20;
    expect(await createAsyncStorage<Schema>({ adapter, now: () => t }).prune()).toBe(1);
  });

  it('snapshots decrypted values and restores them encrypted under another namespace', async () => {
    const adapter = memoryStorage();
    const encryption = { keyProvider: staticKeyProvider(key) };
    const from = createStorage<Schema>({ adapter, namespace: 'a', encryption });
    await from.set('session', session, { encrypt: true });
    const snapshot = await from.snapshot();
    expect(snapshot.session).toMatchObject({ value: session, encrypted: true });
    const to = createStorage<Schema>({ adapter, namespace: 'b', encryption });
    expect(await to.restore(snapshot)).toBe(1);
    expect(raw(adapter, 'b:session').enc).toBeDefined();
    expect(await to.get('session')).toEqual(session);
  });

  it('passes the key id through, so a rotated provider finds the old key', async () => {
    const next = await generateEncryptionKey();
    const seen: unknown[] = [];
    const rotating: EncryptionKeyProvider = {
      async getKey(context) {
        seen.push(context);
        if (context.operation === 'encrypt') return { key: next, id: 'k2' };
        return context.keyId === 'k1' ? key : next;
      },
    };
    const adapter = memoryStorage();
    await createStorage<Schema>({ adapter, namespace: 'app', encryption: { keyProvider: staticKeyProvider(key, 'k1') } }).set('session', session, { encrypt: true });
    const storage = createStorage<Schema>({ adapter, namespace: 'app', encryption: { keyProvider: rotating } });
    expect(await storage.get('session')).toEqual(session);
    expect(seen[0]).toEqual({ key: 'session', namespace: 'app', operation: 'decrypt', keyId: 'k1' });
    await storage.update('session', (s) => s!);
    expect(raw(adapter, 'app:session').enc.kid).toBe('k2');
  });

  it('accepts a raw 32-byte key', async () => {
    const imported = await importEncryptionKey(new Uint8Array(32).fill(7));
    const storage = createStorage<Schema>({ encryption: { keyProvider: staticKeyProvider(imported) } });
    await storage.set('theme', 'x', { encrypt: true });
    expect(await storage.get('theme')).toBe('x');
    await expect(importEncryptionKey(new Uint8Array(16))).rejects.toThrow(TypeError);
  });
});

describe('encryption failures', () => {
  const tamper = async (edit: (stored: Record<string, any>) => void) => {
    const { adapter, storage } = setup();
    await storage.set('session', session, { encrypt: true, ttl: 1e9 });
    const stored = raw(adapter, 'session');
    edit(stored);
    adapter.set('session', JSON.stringify(stored));
    return storage.get('session');
  };
  const flip = (b64: string) => (b64[0] === 'A' ? 'B' : 'A') + b64.slice(1);

  it('fails authentication on a changed ciphertext, tag or metadata', async () => {
    await expect(tamper((s) => (s.enc.data = flip(s.enc.data)))).rejects.toThrow(StorageDecryptionError);
    await expect(tamper((s) => (s.enc.tag = flip(s.enc.tag)))).rejects.toThrow(StorageDecryptionError);
    await expect(tamper((s) => (s.expiresAt += 1))).rejects.toThrow(StorageDecryptionError);
  });

  it('fails authentication when a payload is copied under another key', async () => {
    const { adapter, storage } = setup();
    await storage.set('session', session, { encrypt: true });
    adapter.set('theme', adapter.get('session')!);
    await expect(storage.get('theme')).rejects.toThrow(StorageDecryptionError);
  });

  it('fails authentication with the wrong key', async () => {
    const { adapter, storage } = setup();
    await storage.set('session', session, { encrypt: true });
    const other = createStorage<Schema>({ adapter, encryption: { keyProvider: staticKeyProvider(generateEncryptionKey()) } });
    await expect(other.get('session')).rejects.toThrow(StorageDecryptionError);
  });

  it('names what is wrong with the stored payload', async () => {
    await expect(tamper((s) => (s.enc.v = 2))).rejects.toThrow(StorageEncryptionVersionError);
    await expect(tamper((s) => (s.enc.alg = 'AES-128-CBC'))).rejects.toThrow(StorageEncryptionAlgorithmError);
    await expect(tamper((s) => delete s.enc.iv)).rejects.toThrow(StorageEncryptionMetadataError);
    await expect(tamper((s) => (s.enc = 'x'))).rejects.toThrow(StorageEncryptionMetadataError);
    await expect(tamper((s) => (s.enc.data = '***'))).rejects.toThrow(StorageEncryptedPayloadError);
    await expect(tamper((s) => (s.enc.iv = 'AAAA'))).rejects.toThrow(StorageEncryptedPayloadError);
  });

  it('refuses without a key provider, or with an unusable key', async () => {
    const adapter = memoryStorage();
    const plain = createAsyncStorage<Schema>({ adapter });
    await expect(plain.set('session', session, { encrypt: true })).rejects.toThrow(StorageEncryptionKeyError);
    await setup(adapter).storage.set('session', session, { encrypt: true });
    await expect(plain.get('session')).rejects.toThrow(StorageEncryptionKeyError);
    const hmac = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const bad = createStorage<Schema>({ encryption: { keyProvider: staticKeyProvider(hmac) } });
    await expect(bad.set('session', session, { encrypt: true })).rejects.toThrow(StorageEncryptionKeyError);
    const failing = createStorage<Schema>({ encryption: { keyProvider: { getKey: () => Promise.reject(new Error('vault down')) } } });
    await expect(failing.set('session', session, { encrypt: true })).rejects.toBeInstanceOf(StorageEncryptionError);
  });

  it('lets a sync storage manage encrypted entries but never read them', async () => {
    const { adapter, storage } = setup();
    await storage.set('session', session, { encrypt: true });
    await storage.set('theme', 'dark');
    const sync = createStorage<Schema>({ adapter });
    expect(sync.get('theme')).toBe('dark');
    expect(sync.has('session')).toBe(true);
    expect(sync.size()).toBe(2);
    expect(() => sync.get('session')).toThrow(StorageEncryptionUnavailableError);
    sync.remove('session');
    expect(await storage.has('session')).toBe(false);
  });
});

describe('types', () => {
  it('is async with encryption and sync without', () => {
    expectTypeOf(createStorage<Schema>({ encryption: { keyProvider: staticKeyProvider(key) } })).toEqualTypeOf<AsyncTypedStorage<Schema>>();
    expectTypeOf(createStorage<Schema>()).toEqualTypeOf<TypedStorage<Schema>>();
    // @ts-expect-error encrypt is an async storage option
    createStorage<Schema>().set('theme', 'x', { encrypt: true });
  });
});

describe('copyStorage with an async storage', () => {
  it('copies plain items into an encrypted storage and back', async () => {
    const { copyStorage } = await import('../index.js');
    const plain = createStorage<Schema>();
    plain.set('theme', 'dark');
    const sealed = createStorage<Schema>({ encryption: { keyProvider: staticKeyProvider(key) } });
    await sealed.set('session', session, { encrypt: true });
    expect(await copyStorage(plain, sealed)).toBe(1);
    expect(await sealed.get('theme')).toBe('dark');
    const target = createAsyncStorage<Schema>({ encryption: { keyProvider: staticKeyProvider(key) } });
    expect(await copyStorage(sealed, target, { keys: ['session'] })).toBe(1);
    expect((await target.getEntry('session'))?.encrypted).toBe(true);
    expectTypeOf(copyStorage(plain, createStorage<Schema>())).toEqualTypeOf<number>();
  });
});
