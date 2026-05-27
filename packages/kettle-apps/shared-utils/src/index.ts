import { createHash } from 'node:crypto';
import type { EntityType, SyncDirection } from '@leuzman/shared-types';

// ─── Idempotency & sync keys ──────────────────────────────────────────────────

export function generateIdempotencyKey(
  entityType: EntityType,
  entityId: string,
  operation: 'create' | 'update' | 'delete',
): string {
  return `${entityType}:${entityId}:${operation}:${Date.now()}`;
}

export function generateSyncKey(
  entityType: EntityType,
  sourceId: string,
  direction: SyncDirection,
): string {
  return `${direction}:${entityType}:${sourceId}`;
}

// ─── Async utilities ──────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry?: (err: unknown) => boolean;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, shouldRetry } = opts;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const isLastAttempt = attempt === maxAttempts;
      const retriable = shouldRetry ? shouldRetry(err) : true;

      if (isLastAttempt || !retriable) {
        throw err;
      }

      const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * baseDelayMs;
      const delay = Math.min(exponentialDelay + jitter, maxDelayMs);
      await sleep(delay);
    }
  }

  throw lastError;
}

// ─── Array utilities ──────────────────────────────────────────────────────────

export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) throw new RangeError('chunk size must be greater than 0');
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export function groupBy<T, K>(arr: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

// ─── Odoo helpers ─────────────────────────────────────────────────────────────

export type OdooDomain = [string, string, unknown][];

export function toOdooDomain(filters: Record<string, unknown>): OdooDomain {
  return Object.entries(filters).map(([field, value]) => [field, '=', value]);
}

export function formatCurrency(amountCents: number, currency: string): string {
  return `${(amountCents / 100).toFixed(2)} ${currency}`;
}

export function parseOdooDate(s: string): Date {
  // Odoo format: 'YYYY-MM-DD HH:mm:ss'
  // Replace the space with 'T' so native Date can parse it as ISO-like
  return new Date(s.replace(' ', 'T') + 'Z');
}

export function toOdooDate(d: Date): string {
  const pad = (n: number, len = 2): string => String(n).padStart(len, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

// ─── JSON ─────────────────────────────────────────────────────────────────────

export function safeJsonParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

// ─── Crypto / security ───────────────────────────────────────────────────────

export function hashSha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function maskSecret(s: string): string {
  if (s.length <= 4) return '****';
  return '*'.repeat(s.length - 4) + s.slice(-4);
}

// ─── Odoo error guard ─────────────────────────────────────────────────────────

export function isOdooError(e: unknown): e is { faultCode?: string; message?: string } {
  if (typeof e !== 'object' || e === null) return false;
  const err = e as Record<string, unknown>;
  return (
    err['faultCode'] !== undefined ||
    (typeof err['message'] === 'string' && err['message'].includes('Odoo'))
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedQuery {
  offset: number;
  limit: number;
}

export function buildPaginatedQuery(page: number, pageSize: number): PaginatedQuery {
  return {
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}
