// What changed, rather than what the value is now.
//
// `todos [{…}] → [{…}, {…}]` says nothing the graph did not. "One row added at index 2, here
// it is" does. Computed at the write, while both sides are still in hand — afterwards only
// the new value exists.

import { formatValue } from './format.js';

export type ChangeOp = 'added' | 'removed' | 'changed';

export interface ChangeEntry {
  /** An array index as a string, or an object key. */
  readonly key: string;
  readonly op: ChangeOp;
  /** Formatted, and short: a diff is a list, not a document. */
  readonly from?: string;
  readonly to?: string;
  /**
   * The two sides as JSON, for showing an object as an object and for copying it. Per entry,
   * so the cost is one row rather than the whole value. Absent for a cycle, a function, a dom
   * node, or anything over the cap.
   */
  readonly fromJson?: string;
  readonly toJson?: string;
}

export interface ValueChange {
  /** How to read `entries`: positions for an array, keys for an object, neither for a value. */
  readonly shape: 'value' | 'array' | 'object';
  readonly entries?: ChangeEntry[];
  /** Set when the diff had to stop early, so a reader knows the list is not the whole of it. */
  readonly more?: number;
  /** Array only, and worth saying on its own: a list that grew or shrank. */
  readonly length?: { readonly from: number; readonly to: number };
}

/** Enough to see what happened, few enough that a write stays cheap. */
const MAX_ENTRIES = 24;
/** Per side of one entry. A row of a list, not the whole row's contents. */
const ENTRY_VALUE = 120;

/** Past this an entry is a document rather than a row, and not worth carrying per write. */
const ENTRY_JSON = 4000;

const show = (value: unknown): string => formatValue(value, ENTRY_VALUE);

/** Structure only: `show` already gives the whole of a number, and a second copy of `3` helps nobody. */
function json(value: unknown): string | undefined {
  if (value === null || typeof value !== 'object') return undefined;
  try {
    const text = JSON.stringify(value);
    return text && text.length <= ENTRY_JSON ? text : undefined;
  } catch {
    // Cyclic, or a getter that threw. The formatted string still says what it is.
    return undefined;
  }
}

/** One side of an entry: what to read, and what to copy. */
const side = (value: unknown, key: 'from' | 'to'): Record<string, string | undefined> => {
  const text = json(value);
  return { [key]: show(value), ...(text ? { [`${key}Json`]: text } : {}) };
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reference first: a store hands back the same proxy for an unchanged row, so an append costs
 * one comparison each. The shallow fallback catches rows rebuilt with the same contents.
 */
function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/**
 * Ends trimmed first. Index-against-index reports every row after an insertion as changed,
 * which is true of the positions and useless to whoever added one row.
 */
function diffArray(before: readonly unknown[], after: readonly unknown[]): ValueChange {
  let head = 0;
  while (head < before.length && head < after.length && same(before[head], after[head])) head++;

  let tail = 0;
  while (
    tail < before.length - head &&
    tail < after.length - head &&
    same(before[before.length - 1 - tail], after[after.length - 1 - tail])
  ) {
    tail++;
  }

  const entries: ChangeEntry[] = [];
  let skipped = 0;
  const push = (entry: ChangeEntry): void => {
    if (entries.length < MAX_ENTRIES) entries.push(entry);
    else skipped++;
  };

  const removedCount = before.length - head - tail;
  const addedCount = after.length - head - tail;
  const overlap = Math.min(removedCount, addedCount);

  // The overlap is a replacement in place; the remainder is the insertion or deletion.
  for (let i = 0; i < overlap; i++) {
    push({
      key: String(head + i),
      op: 'changed',
      ...side(before[head + i], 'from'),
      ...side(after[head + i], 'to'),
    });
  }
  for (let i = overlap; i < addedCount; i++) {
    push({ key: String(head + i), op: 'added', ...side(after[head + i], 'to') });
  }
  for (let i = overlap; i < removedCount; i++) {
    push({ key: String(head + i), op: 'removed', ...side(before[head + i], 'from') });
  }

  return {
    shape: 'array',
    entries,
    ...(skipped ? { more: skipped } : {}),
    ...(before.length !== after.length ? { length: { from: before.length, to: after.length } } : {}),
  };
}

function diffObject(before: Record<string, unknown>, after: Record<string, unknown>): ValueChange {
  const entries: ChangeEntry[] = [];
  let skipped = 0;
  const push = (entry: ChangeEntry): void => {
    if (entries.length < MAX_ENTRIES) entries.push(entry);
    else skipped++;
  };

  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const had = key in before;
    const has = key in after;
    if (had && has) {
      if (!same(before[key], after[key])) {
        push({ key, op: 'changed', ...side(before[key], 'from'), ...side(after[key], 'to') });
      }
    } else if (has) push({ key, op: 'added', ...side(after[key], 'to') });
    else push({ key, op: 'removed', ...side(before[key], 'from') });
  }

  return { shape: 'object', entries, ...(skipped ? { more: skipped } : {}) };
}

/** A plain value is its own diff: the entry already carries both sides. */
export function diffValues(before: unknown, after: unknown): ValueChange | undefined {
  if (Array.isArray(before) && Array.isArray(after)) {
    const change = diffArray(before, after);
    return change.entries?.length || change.length ? change : undefined;
  }
  if (isPlainObject(before) && isPlainObject(after)) {
    const change = diffObject(before, after);
    return change.entries?.length ? change : undefined;
  }
  return undefined;
}
