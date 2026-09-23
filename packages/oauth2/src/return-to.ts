/**
 * Where a completed login is allowed to land.
 *
 * A login flow carries a destination so a visitor resumes where they were interrupted,
 * and that destination arrives from outside: a query parameter, a caller's argument, a
 * value read back out of storage. Redirecting to it unchecked is an open redirect, and a
 * login is the worst place to have one. The visitor has just authenticated, so the page
 * they land on is trusted by them and reached with a live session.
 *
 * Sealing the value does not help. A signed cookie cannot be tampered with, and an
 * attacker putting `?returnTo=https://evil.example/` on a link has no need to tamper: the
 * application seals the attacker's value itself and honours it afterwards.
 *
 * So the rule is what the value is allowed to be, rather than where it came from. A path
 * on this origin, and nothing else.
 */

/** What a destination has to look like to be used. */
export interface ReturnToOptions {
  /**
   * Where to go when the destination is missing or refused. Default `/`.
   *
   * A refusal falls back rather than failing: someone who followed a poisoned link should
   * still end up signed in, on a page of this application's choosing.
   */
  fallback?: string;
  /**
   * Origins allowed in addition to this one, for an application that really does span
   * several. Each must be an exact origin, `https://app.example.com`, and is compared as
   * one rather than by prefix, so `https://app.example.com.evil.test` cannot pass.
   */
  allowedOrigins?: string[];
  /** This origin, when it cannot be read from `location`. Required on a server. */
  origin?: string;
}

/**
 * The destination to use, which is `candidate` when it is safe and the fallback when not.
 *
 * Refused, with reasons:
 *
 * - an absolute URL on another origin, which is the open redirect itself
 * - `//host`, which a browser reads as protocol-relative and therefore another origin
 * - `\\host`, which some browsers normalise to the same thing
 * - a scheme of any kind, so `javascript:` and `data:` cannot be reached
 * - a control character, which can be used to smuggle a newline past a naive check
 * - anything that is not a path, since a bare `dashboard` resolves differently depending
 *   on where it is used
 */
export function safeReturnTo(
  candidate: string | null | undefined,
  options: ReturnToOptions = {},
): string {
  const fallback = options.fallback ?? '/';
  if (!candidate || typeof candidate !== 'string') return fallback;

  const value = candidate.trim();
  if (!value) return fallback;

  // A newline or a NUL can split a header or end a string early in whatever reads it next.
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;

  // Protocol-relative in both spellings. `//evil.test` is another origin, and a backslash
  // is normalised to a slash by enough browsers to count.
  if (/^[/\\]{2}/.test(value)) return fallback;

  // A path on this origin, which is the ordinary case and the only one needing no origin
  // to compare against.
  if (value.startsWith('/')) return value;

  // Anything else has to be an absolute URL on an origin this application accepts.
  const here =
    options.origin ?? (typeof location === 'undefined' ? undefined : location.origin);
  const allowed = [here, ...(options.allowedOrigins ?? [])].filter(Boolean) as string[];
  if (!allowed.length) return fallback;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    // Not a URL and not a path: a bare word, which resolves differently depending on the
    // page it is used from.
    return fallback;
  }

  // Compared as whole origins. A prefix test would accept
  // `https://app.example.com.evil.test`, which is a different site.
  if (!allowed.includes(url.origin)) return fallback;

  // Only http and https, whatever the origin list says: an allowed origin cannot make
  // `javascript:` safe, and `new URL('javascript:...')` has an origin of `null` anyway.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return fallback;

  return url.toString();
}
