export function windowObject() {
  return typeof globalThis === 'object'
    ? globalThis
    : typeof window === 'object'
    ? window
    : typeof self === 'object'
    ? self
    : typeof global === 'object'
    ? global
    : null;
}

export function btoa(chn: any) {
  return Buffer.from(chn).toString('base64');
}

export function uena(chn: any): string | null {
  return Buffer.from(chn).toString('base64');
}
// Ascii encodé en base64 en chaîne ucs-2
export function aenu(chn: any): string {
  return decodeURIComponent(Buffer.from(chn, 'base64').toString('utf-8'));
}

export const updateQueryStringParameter = (
  uri: string,
  key: string,
  val: string
): string => {
  let value = val;
  const re = new RegExp('([?&])' + key + '=.*?(&|$)', 'i');
  const separator = uri.includes('?') ? '&' : '?';
  if (key === 'country') {
    value = JSON.parse(value).alpha_2;
  }
  if (key === 'phone') {
    value = value.trim().replace(/\s/g, '');
  }
  const match: RegExpMatchArray | null = uri.match(re);
  if (typeof match !== 'undefined' && match !== null) {
    return uri.replace(re, '$1' + key + '=' + value + '$2');
  }
  return uri + separator + key + '=' + value;
};
