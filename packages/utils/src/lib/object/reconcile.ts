export interface ReconcileOptions {
  key?: string | false;
  merge?: boolean;
  keepRef?: boolean;
}

function isPlain(v: unknown): v is Record<string, unknown> {
  if (v == null || typeof v !== 'object') return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
}

function reconcileValue(next: any, current: any, opts: Required<ReconcileOptions>): any {
  if (next === current) return current;
  if (Array.isArray(next)) return reconcileArr(next, Array.isArray(current) ? current : [], opts);
  if (isPlain(next)) return reconcileObj(next, isPlain(current) ? current : {}, opts);
  return next;
}

function reconcileArr(next: any[], current: any[], opts: Required<ReconcileOptions>): any[] {
  const { key, keepRef } = opts;
  const curLen = current.length;
  const nextLen = next.length;

  // Snapshot once — avoids repeated proxy reads returning different references
  const curItems: any[] = new Array(curLen);
  for (let i = 0; i < curLen; i++) curItems[i] = current[i];

  if (key === false) {
    // Index-based
    if (keepRef) {
      for (let i = 0; i < nextLen; i++) {
        const rv = reconcileValue(next[i], curItems[i], opts);
        if (rv !== curItems[i]) current[i] = rv;
      }
      if (curLen > nextLen) current.splice(nextLen);
      return current;
    }

    let changed = nextLen !== curLen;
    const out: any[] = new Array(nextLen);
    for (let i = 0; i < nextLen; i++) {
      out[i] = reconcileValue(next[i], curItems[i], opts);
      if (out[i] !== curItems[i]) changed = true;
    }
    return changed ? out : current;
  }

  // Key-based: build lookup from snapshot
  const currentMap = new Map<unknown, any>();
  for (let i = 0; i < curLen; i++) {
    const item = curItems[i];
    if (item != null && typeof item === 'object' && key in item) {
      currentMap.set((item as any)[key], item);
    }
  }

  const resolved: any[] = new Array(nextLen);
  for (let i = 0; i < nextLen; i++) {
    const n = next[i];
    if (n != null && typeof n === 'object' && key in n) {
      resolved[i] = reconcileValue(n, currentMap.get((n as any)[key]), opts);
    } else {
      resolved[i] = reconcileValue(n, curItems[i], opts);
    }
  }

  if (keepRef) {
    for (let i = 0; i < nextLen; i++) {
      if (resolved[i] !== curItems[i]) current[i] = resolved[i];
    }
    if (curLen > nextLen) current.splice(nextLen);
    return current;
  }

  // Immutable: compare resolved positions against snapshotted positions
  let changed = nextLen !== curLen;
  for (let i = 0; !changed && i < nextLen; i++) {
    if (resolved[i] !== curItems[i]) changed = true;
  }
  return changed ? resolved : current;
}

function reconcileObj(
  next: Record<string, unknown>,
  current: Record<string, unknown>,
  opts: Required<ReconcileOptions>
): Record<string, unknown> {
  const { merge, keepRef } = opts;
  const nextKeys = Object.keys(next);
  const currentKeys = Object.keys(current);

  // Snapshot current values once to avoid repeated proxy reads
  const curValues: Record<string, unknown> = Object.create(null);
  for (let i = 0; i < currentKeys.length; i++) {
    curValues[currentKeys[i]] = (current as any)[currentKeys[i]];
  }

  let out: Record<string, unknown> | null = null;
  const getOut = (): Record<string, unknown> => {
    if (!out) out = keepRef ? current : { ...curValues };
    return out;
  };

  if (!merge) {
    for (let i = 0; i < currentKeys.length; i++) {
      const k = currentKeys[i];
      if (!(k in next)) delete getOut()[k];
    }
  }

  for (let i = 0; i < nextKeys.length; i++) {
    const k = nextKeys[i];
    const cv = curValues[k];
    const rv = reconcileValue(next[k], cv, opts);
    if (rv !== cv || !(k in curValues)) getOut()[k] = rv;
  }

  return out ?? current;
}

export function reconcile<T>(next: T, options?: ReconcileOptions): (current: T | undefined) => T {
  const opts: Required<ReconcileOptions> = {
    key: options?.key !== undefined ? options.key : 'id',
    merge: options?.merge ?? false,
    keepRef: options?.keepRef ?? false,
  };
  return (current: T | undefined): T => {
    if (current === undefined || current === null) return next;
    return reconcileValue(next, current, opts) as T;
  };
}
