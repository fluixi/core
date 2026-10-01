// Storage keys carry `:` from namespaces, which a cookie name cannot hold. `(` and `)` pass
// encodeURIComponent but are not token characters either.
export const encodeCookieName = (key: string) =>
  encodeURIComponent(key).replace(/[()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export const decodeCookieName = (name: string) => {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

/** Bytes of `name=value` in a Set-Cookie string: what browsers hold to about 4096. */
export const cookiePairSize = (header: string) => new TextEncoder().encode(header.slice(0, header.indexOf(';'))).length;
