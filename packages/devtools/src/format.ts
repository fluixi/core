// Turning a live value into something a graph can print.
//
// Not JSON.stringify: a signal holds whatever the author put in it, a Map, a Date, a class
// instance, a dom node, something that refers to itself, a getter that throws, and
// stringify answers `{}`, `[object Object]` or an exception for most of that. This walks the
// value instead, so every case has an answer and none of them is a crash.
//
// It is a label, not a serializer. Depth and length are capped, and what is cut says so.

const MAX_DEPTH = 3;
const MAX_ENTRIES = 8;

/** A dom node, without assuming this realm's Node, an iframe's is a different class. */
function domName(v: { nodeType?: number; nodeName?: string; tagName?: string }): string | null {
  if (typeof v?.nodeType !== 'number' || typeof v.nodeName !== 'string') return null;
  return v.tagName ? `<${v.tagName.toLowerCase()}>` : `#${v.nodeName.toLowerCase()}`;
}

function fnName(v: (...args: never[]) => unknown): string {
  return v.name ? `ƒ ${v.name}()` : 'ƒ';
}

/** The constructor's name, when it says more than "Object" would. */
function className(v: object): string {
  const name = (v as { constructor?: { name?: string } }).constructor?.name;
  return name && name !== 'Object' ? `${name} ` : '';
}

function primitive(v: unknown): string | null {
  if (v === null) return 'null';
  switch (typeof v) {
    case 'undefined':
      return 'undefined';
    case 'string':
      return JSON.stringify(v);
    case 'number':
    case 'boolean':
      return String(v);
    case 'bigint':
      return `${v}n`;
    case 'symbol':
      return v.toString();
    case 'function':
      return fnName(v as (...args: never[]) => unknown);
    default:
      return null;
  }
}

function walk(value: unknown, depth: number, seen: Set<object>): string {
  const simple = primitive(value);
  if (simple !== null) return simple;

  const object = value as object;
  if (seen.has(object)) return '[circular]';

  const dom = domName(object as { nodeType?: number });
  if (dom) return dom;
  if (object instanceof Date) return Number.isNaN(object.getTime()) ? 'Invalid Date' : object.toISOString();
  if (object instanceof RegExp) return String(object);
  if (object instanceof Error) return `${object.name}: ${object.message}`;
  if (object instanceof Promise) return 'Promise';
  if (ArrayBuffer.isView(object)) {
    return `${className(object).trim()}(${(object as { length?: number }).length ?? ''})`;
  }

  if (depth >= MAX_DEPTH) return Array.isArray(object) ? '[…]' : '{…}';

  seen.add(object);
  try {
    if (Array.isArray(object)) {
      const shown = object.slice(0, MAX_ENTRIES).map((item) => walk(item, depth + 1, seen));
      if (object.length > MAX_ENTRIES) shown.push('…');
      return `[${shown.join(', ')}]`;
    }
    if (object instanceof Map) {
      const shown: string[] = [];
      for (const [k, v] of object) {
        if (shown.length === MAX_ENTRIES) {
          shown.push('…');
          break;
        }
        shown.push(`${walk(k, depth + 1, seen)} => ${walk(v, depth + 1, seen)}`);
      }
      return `Map(${object.size}) {${shown.join(', ')}}`;
    }
    if (object instanceof Set) {
      const shown: string[] = [];
      for (const item of object) {
        if (shown.length === MAX_ENTRIES) {
          shown.push('…');
          break;
        }
        shown.push(walk(item, depth + 1, seen));
      }
      return `Set(${object.size}) {${shown.join(', ')}}`;
    }

    const keys = Object.keys(object);
    const shown = keys.slice(0, MAX_ENTRIES).map((key) => {
      // A getter can throw, and a proxy can refuse. Neither is worth losing the whole value.
      let read: string;
      try {
        read = walk((object as Record<string, unknown>)[key], depth + 1, seen);
      } catch {
        read = '[unreadable]';
      }
      return `${key}: ${read}`;
    });
    if (keys.length > MAX_ENTRIES) shown.push('…');
    return `${className(object)}{${shown.join(', ')}}`;
  } finally {
    seen.delete(object);
  }
}

/**
 * A printable rendering of any value. Never throws, never leaves `[object Object]`.
 *
 * `limit` caps the result; what is cut ends in an ellipsis.
 */
export function formatValue(value: unknown, limit = 240): string {
  let text: string;
  try {
    text = walk(value, 0, new Set());
  } catch {
    text = '[unreadable]';
  }
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

/** The short form a node card has room for. */
export function shorten(text: string, limit = 18): string {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

/**
 * The same text across lines, so a value too wide to read is readable.
 *
 * Works on what `formatValue` produced rather than on the value itself: a panel elsewhere
 * has only the string. Quotes are tracked so a brace inside one is left alone.
 */
export function indentValue(text: string, pad = '  '): string {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let line = '';

  const flush = (): void => {
    if (line.trim()) out.push(pad.repeat(depth) + line.trim());
    line = '';
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quote) {
      line += c;
      if (c === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      line += c;
      continue;
    }
    if (c === '{' || c === '[') {
      line += c;
      flush();
      depth++;
      continue;
    }
    if (c === '}' || c === ']') {
      flush();
      depth = Math.max(0, depth - 1);
      line = c;
      continue;
    }
    if (c === ',') {
      line += c;
      flush();
      continue;
    }
    line += c;
  }
  flush();
  return out.join('\n');
}
