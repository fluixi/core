import { createHash } from 'node:crypto';

/** The namespace of job ids, a version 5 UUID input: fixed, so a key names the same job on every server. */
const NAMESPACE = '9f3c2b8e-6d41-4c7a-9a52-1e0b7d6f4a10';

const bytesOf = (uuid: string) => Uint8Array.from(Buffer.from(uuid.replace(/-/g, ''), 'hex'));

/**
 * The id of the job a key names: a version 5 UUID of `job:key`. A second send with the same key
 * finds the first job instead of making another, whether it is waiting, running or done.
 */
export function jobIdFor(job: string, key: string): string {
  const hash = createHash('sha1').update(bytesOf(NAMESPACE)).update(`${job}:${key}`, 'utf8').digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
