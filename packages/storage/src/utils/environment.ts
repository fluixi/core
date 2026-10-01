/** Lazy checks: nothing here reads a browser global until it is called. */
export function hasWindow(): boolean {
  return typeof window !== 'undefined';
}
