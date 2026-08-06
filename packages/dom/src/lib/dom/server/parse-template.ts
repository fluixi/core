/**
 * Parse a compiler-emitted template into server nodes.
 *
 * Deliberately **not** an HTML parser. The only input it ever sees is the output of the
 * compiler's `serializeStatic`, which emits a narrow, known grammar: lowercase tag names,
 * double-quoted attribute values, entity-escaped text, void elements left unclosed, no
 * namespaces, no comments, no raw `<script>`/`<style>` content. Keeping the input
 * controlled is what makes this a small total function instead of a spec project — and
 * the round-trip test pins the two together, so the grammar cannot drift on one side.
 *
 * A hole-free template never reaches here: it is carried verbatim as a `ServerRaw` node,
 * which is strictly cheaper. This exists for templates with holes, where the server has
 * to produce real nodes for the hole content to be inserted into.
 */
import { ServerComment, ServerElement, ServerText } from './nodes.js';
import type { ServerNode } from './nodes.js';

/** Elements the HTML parser closes itself — they never have children. */
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
};

function unescape(text: string): string {
  return text.replace(/&(#?\w+);/g, (whole, name: string) => ENTITIES[name] ?? whole);
}

export class TemplateParseError extends Error {}

/**
 * Build the server-node tree for `html`.
 *
 * Returns the single root element. The compiler only ever emits a template rooted at one
 * element, so more than one root is a bug on the emitting side rather than something to
 * paper over here.
 */
export function parseTemplate(html: string, isSVG = false): ServerElement {
  let i = 0;
  const roots: ServerNode[] = [];
  const stack: ServerElement[] = [];

  const append = (node: ServerNode): void => {
    const parent = stack[stack.length - 1];
    if (parent) parent.appendChild(node);
    else roots.push(node);
  };

  while (i < html.length) {
    const lt = html.indexOf('<', i);

    if (lt === -1) {
      addText(html.slice(i));
      break;
    }
    if (lt > i) addText(html.slice(i, lt));

    // `<!---->` marks a hole. It has to survive into the server's markup, or hydration
    // would see a different shape from the one the generated paths describe.
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt);
      if (end === -1) throw new TemplateParseError(`unterminated comment at ${lt}`);
      append(new ServerComment(html.slice(lt + 4, end)));
      i = end + 3;
      continue;
    }

    if (html[lt + 1] === '/') {
      const end = html.indexOf('>', lt);
      if (end === -1) throw new TemplateParseError(`unterminated closing tag at ${lt}`);
      const tag = html.slice(lt + 2, end).trim().toLowerCase();
      const open = stack.pop();
      if (!open || open.localName !== tag) {
        throw new TemplateParseError(
          `</${tag}> does not close <${open?.localName ?? 'nothing'}>`,
        );
      }
      i = end + 1;
      continue;
    }

    i = openTag(lt);
  }

  if (stack.length > 0) {
    throw new TemplateParseError(`unclosed <${stack[stack.length - 1]!.localName}>`);
  }
  const root = roots[0];
  if (roots.length !== 1 || !(root instanceof ServerElement)) {
    throw new TemplateParseError(`expected exactly one root element, got ${roots.length}`);
  }
  return root;

  function addText(raw: string): void {
    if (raw === '') return;
    append(new ServerText(unescape(raw)));
  }

  /** Consume `<tag attr="v" …>` starting at `lt`, returning the offset just past it. */
  function openTag(lt: number): number {
    const nameEnd = /[\s/>]/.exec(html.slice(lt + 1));
    if (!nameEnd) throw new TemplateParseError(`unterminated tag at ${lt}`);
    const tag = html.slice(lt + 1, lt + 1 + nameEnd.index).toLowerCase();
    const el = new ServerElement(tag, isSVG);

    let j = lt + 1 + nameEnd.index;
    while (j < html.length) {
      while (j < html.length && /\s/.test(html[j]!)) j++;
      if (html[j] === '>') {
        j++;
        break;
      }
      if (html[j] === '/' && html[j + 1] === '>') {
        j += 2;
        break;
      }

      const attrStart = j;
      while (j < html.length && !/[\s=/>]/.test(html[j]!)) j++;
      const name = html.slice(attrStart, j);
      if (name === '') throw new TemplateParseError(`malformed attribute at ${j}`);

      if (html[j] === '=') {
        // The serializer always quotes, so an unquoted value means the input did not
        // come from it — refuse rather than guess.
        if (html[j + 1] !== '"') {
          throw new TemplateParseError(`attribute ${name} must have a double-quoted value`);
        }
        const close = html.indexOf('"', j + 2);
        if (close === -1) throw new TemplateParseError(`unterminated value for ${name}`);
        el.setAttribute(name, unescape(html.slice(j + 2, close)));
        j = close + 1;
      } else {
        el.setAttribute(name, '');
      }
    }

    append(el);
    if (!VOID_ELEMENTS.has(tag)) stack.push(el);
    return j;
  }
}
