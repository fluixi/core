/**
 * readChildren — resolve a children thunk into a reactive accessor: unwrap nested
 * thunks, flatten arrays, and stop at signals/memos so they stay reactive. Built on
 * the TC39 memo (compat), so the resolution tracks TC39 signals correctly.
 */
import { createMemo } from './compat.js';
import { isSignal, __DEV__ } from './detect.js';

function resolveChildrenValue(children: any): any {
  if (typeof children === 'function' && !children.length) {
    const result = children();
    if (isSignal(result)) return result;
    return resolveChildrenValue(result);
  }
  if (Array.isArray(children)) {
    const results: any[] = [];
    for (let i = 0; i < children.length; i++) {
      const result = resolveChildrenValue(children[i]);
      Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
    }
    return results;
  }
  return children;
}

export function readChildren(fn: any) {
  const children = createMemo(fn);
  return __DEV__
    ? createMemo(() => resolveChildrenValue(children()), undefined, { name: 'children' })
    : createMemo(() => resolveChildrenValue(children()));
}
