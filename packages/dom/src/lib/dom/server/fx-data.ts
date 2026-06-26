/**
 * The SSR data transport (`__FX_DATA__`) — emission escaping + client reader.
 *
 * The server collects resolved resource values + seeds (i18n locale, isomorphic state) and
 * embeds them in the page so the client hydrates without refetching. SECURITY MODEL:
 *
 *  - It is NON-SECRET BY DESIGN — it's in the page, readable by the user. Encrypting it buys
 *    nothing (the client would need the key). Keep server-only fields OUT via setDataRedactor;
 *    fetch truly sensitive data through a `"use server"` function instead. Don't obfuscate.
 *
 *  - Emitted as a NON-EXECUTABLE `<script type="application/json">`, read via `JSON.parse` of
 *    its `textContent`. So (a) a value can never execute as JS, and (b) it's CSP-friendly —
 *    it works under a strict `script-src` that forbids inline executable scripts.
 *
 *  - The JSON is escaped with the standard SSR-JSON set (`<`, `>`, `&`, U+2028, U+2029) so no
 *    string value can break out of the `<script>` element or corrupt the HTML/JS parse. JSON
 *    round-trips the escapes back to the original characters on `JSON.parse`.
 */

/** The id of the `<script type="application/json">` data block (also the legacy global name). */
export const FX_DATA_ID = '__FX_DATA__';

/**
 * Escape a JSON string for safe embedding inside a `<script>` element.
 * `<`/`>` → can't form `</script>`, `<!--` or `-->`; `&` → no HTML-entity surprises;
 * U+2028/U+2029 → JS line terminators that would break an inline-script read.
 * JSON.parse decodes every `\uXXXX` back to the original character.
 */
export function escapeFxJson(json: string): string {
  return json.replace(/[<>&\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

let _scriptCache: Record<string, unknown> | null | undefined;

/** Clear the parsed-script cache. For tests, and SPA route changes that re-read a fresh page. */
export function resetServerDataCache(): void {
  _scriptCache = undefined;
}

/**
 * Read the server-seeded data on the client. Prefers a pre-set `globalThis.__FX_DATA__`
 * (back-compat + unit tests), otherwise parses the `<script type="application/json"
 * id="__FX_DATA__">` payload once. Returns `null` when the page wasn't server-rendered.
 */
export function getServerData(): Record<string, unknown> | null {
  // Global wins and is never cached, so it reflects the current value (tests set/delete it).
  const g = (globalThis as { __FX_DATA__?: Record<string, unknown> }).__FX_DATA__;
  if (g) return g;
  if (_scriptCache !== undefined) return _scriptCache; // script content is static for the page
  let parsed: Record<string, unknown> | null = null;
  if (typeof document !== 'undefined') {
    const text = document.getElementById(FX_DATA_ID)?.textContent;
    if (text) {
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        parsed = null; // malformed transport → behave as if not server-rendered (refetch)
      }
    }
  }
  return (_scriptCache = parsed);
}
