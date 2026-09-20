/**
 * The id a server function is registered and called by.
 *
 * Client stub and server registration are produced by separate builds of the
 * same file, so this has to agree across them exactly, same hash, same
 * relative path, same index. Shared rather than duplicated for that reason.
 */

// djb2: tiny, stable, dependency-free. Hex, so the id is a valid identifier suffix.
export function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export function serverFnId(filename: string, root: string | undefined, index: number): string {
  const rel = (filename || 'unknown').replace(root ? root + '/' : '', '');
  return `${hash(rel)}:${index}`;
}
