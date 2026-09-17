/**
 * Whether a raw expression slice has to be wrapped in parens before it is dropped
 * into an object value, an argument list, a `return`, or an arrow's concise body.
 *
 * The compiler holds expressions as source text: `IRExpression.code` is deliberately
 * a string (see ir/nodes.ts), so there is no printer to ask about precedence and the
 * decision comes from the characters.
 *
 * Two things bind wrong. A top-level comma reads as a sequence or as an argument
 * separator, and a leading `{` in an arrow body reads as a block. Everything else
 * parses the same wrapped or bare.
 *
 * Wrapping unconditionally was the old answer, and it reached production: esbuild's
 * minifier keeps redundant parens. Measured on the fluixi-ui playground, 3,320 of
 * the 3,322 bytes the native build ran over the babel one were these.
 */

/** Index just past the closing quote, or -1 if the literal never closes. */
function skipQuoted(src: string, start: number): number {
  const quote = src[start];
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') i++;
    else if (c === quote) return i + 1;
    else if (c === '\n') return -1;
  }
  return -1;
}

/** Index just past the closing backtick. Substitutions nest, so this recurses. */
function skipTemplate(src: string, start: number): number {
  let i = start + 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      i += 2;
    } else if (c === '`') {
      return i + 1;
    } else if (c === '$' && src[i + 1] === '{') {
      let depth = 1;
      i += 2;
      while (i < src.length && depth > 0) {
        const k = src[i];
        if (k === '\\') i += 2;
        else if (k === '`') {
          const end = skipTemplate(src, i);
          if (end < 0) return -1;
          i = end;
        } else if (k === '"' || k === "'") {
          const end = skipQuoted(src, i);
          if (end < 0) return -1;
          i = end;
        } else {
          if (k === '{') depth++;
          else if (k === '}') depth--;
          i++;
        }
      }
    } else {
      i++;
    }
  }
  return -1;
}

/** Index just past a regex literal's flags, or -1. */
function skipRegex(src: string, start: number): number {
  let inClass = false;
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') i++;
    else if (c === '[') inClass = true;
    else if (c === ']') inClass = false;
    else if (c === '\n') return -1;
    else if (c === '/' && !inClass) {
      let end = i + 1;
      while (end < src.length && /[a-z]/i.test(src[end])) end++;
      return end;
    }
  }
  return -1;
}

/** A `/` after one of these divides; anywhere else it opens a regex. */
function divides(prev: string): boolean {
  return prev !== '' && /[A-Za-z0-9_$)\]]/.test(prev);
}

/**
 * True when the text has a comma outside every bracket, string and substitution.
 * Null when the scan cannot say, which the caller reads as "assume it does".
 */
export function topLevelComma(src: string): boolean | null {
  let depth = 0;
  let prev = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'") {
      const end = skipQuoted(src, i);
      if (end < 0) return null;
      i = end;
      prev = c;
    } else if (c === '`') {
      const end = skipTemplate(src, i);
      if (end < 0) return null;
      i = end;
      prev = c;
    } else if (c === '/' && src[i + 1] === '/') {
      // A line comment swallows whatever follows it, and a wrapper is no help.
      return null;
    } else if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end < 0) return null;
      i = end + 2;
    } else if (c === '/' && !divides(prev)) {
      const end = skipRegex(src, i);
      if (end < 0) return null;
      i = end;
      prev = '/';
    } else {
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') {
        depth--;
        if (depth < 0) return null;
      } else if (c === ',' && depth === 0) return true;
      if (!/\s/.test(c)) prev = c;
      i++;
    }
  }
  return depth === 0 ? false : null;
}

/** Wrap a raw expression slice only where the characters say it has to be. */
export function paren(code: string, position: 'value' | 'arrowBody'): string {
  const src = code.trim();
  if (src === '') return `(${code})`;
  if (position === 'arrowBody' && src[0] === '{') return `(${code})`;
  return topLevelComma(src) === false ? code : `(${code})`;
}
