/**
 * Keeping a DPoP key across page loads.
 *
 * RFC 9449 §5 binds a refresh token to the key that obtained it, and a refresh must be
 * proved with that same key. A key held only in a variable does not survive a navigation,
 * so the refresh token it came with is unusable from the next document onwards. Okta says so
 * plainly: `invalid_dpop_proof: Invalid DPoP Public Key binding in refresh token`. Browser
 * mode reaches a new document on every sign in, because the callback navigates, so without
 * persistence DPoP and refresh cannot both work.
 *
 * IndexedDB rather than `localStorage`, because it stores a `CryptoKey` itself. The
 * structured clone of a key created with `extractable: false` keeps that property, so the
 * private half is written by the browser, read back by the browser, and never becomes bytes
 * any script can see. `localStorage` holds strings, which would mean exporting the key, and
 * an exported key in storage is a password with extra steps.
 *
 * One key per client, so two clients on the same origin cannot bind to each other's.
 */
import { createDpopKey, type DpopKey } from './dpop.js';

const DB = 'fluixi-oauth2-dpop';
const STORE = 'keys';

/** What is written per client. `privateKey` stays a `CryptoKey` throughout. */
interface StoredKey {
  privateKey: CryptoKey;
  publicJwk: Record<string, unknown>;
  thumbprint: string;
  alg: string;
}

/** Whether this environment can persist a key at all. */
function available(): boolean {
  return typeof indexedDB !== 'undefined';
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexedDB.open failed'));
  });
}

/** One transaction, wrapped so a caller sees a promise rather than three events. */
function act<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('DPoP key request failed'));
        tx.oncomplete = () => db.close();
      }),
  );
}

/** Whether what came back is a usable key rather than a partial or stale record. */
function usable(value: unknown): value is StoredKey {
  const stored = value as StoredKey | undefined;
  return (
    !!stored &&
    typeof stored.thumbprint === 'string' &&
    typeof stored.alg === 'string' &&
    !!stored.publicJwk &&
    // A CryptoKey survives the round trip as a CryptoKey. Anything else means the record was
    // written by something other than this, and binding to it would fail at the provider.
    typeof (stored.privateKey as { type?: unknown } | undefined)?.type === 'string'
  );
}

/**
 * The key for `clientKey`, from storage when one is there and newly made when not.
 *
 * A failure to persist is not a failure to authenticate: the key is still returned, so the
 * flow continues with a key that lasts as long as the document. `onEphemeral` says when that
 * happened, because the consequence is real and silent otherwise, a refresh will be refused
 * after the next navigation.
 */
export async function keyFor(
  clientKey: string,
  alg = 'ES256',
  onEphemeral?: (reason: string) => void,
): Promise<DpopKey> {
  if (!available()) {
    onEphemeral?.('This environment has no IndexedDB, so the key lasts only as long as this document.');
    return createDpopKey(alg);
  }

  try {
    const found = await act<StoredKey | undefined>('readonly', (store) => store.get(clientKey));
    // The algorithm is part of the identity: a config changed from ES256 to RS256 must not
    // keep proving with the old key, since the provider was told which to expect.
    if (usable(found) && found.alg === alg) {
      return {
        privateKey: found.privateKey,
        publicJwk: found.publicJwk,
        thumbprint: found.thumbprint,
        alg: found.alg,
      };
    }
  } catch (cause) {
    onEphemeral?.(
      `The stored DPoP key could not be read (${cause instanceof Error ? cause.message : String(cause)}), so a new one was made.`,
    );
  }

  const key = await createDpopKey(alg);
  try {
    await act('readwrite', (store) =>
      store.put(
        {
          privateKey: key.privateKey,
          publicJwk: key.publicJwk,
          thumbprint: key.thumbprint,
          alg: key.alg,
        } satisfies StoredKey,
        clientKey,
      ),
    );
  } catch (cause) {
    // Private browsing and a full disk both land here.
    onEphemeral?.(
      `The DPoP key could not be stored (${cause instanceof Error ? cause.message : String(cause)}), so a refresh after the next navigation will be refused.`,
    );
  }
  return key;
}

/**
 * Forget the key for `clientKey`.
 *
 * Part of signing out. A key left behind is not a credential on its own, since the tokens
 * bound to it are gone, but the next sign in should not be provably the same client as the
 * last: that is a correlator handed to the provider for nothing.
 */
export async function forgetKey(clientKey: string): Promise<void> {
  if (!available()) return;
  try {
    await act('readwrite', (store) => store.delete(clientKey));
  } catch {
    // Nothing useful to do. The tokens are already gone, which is what signs someone out.
  }
}
