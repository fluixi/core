/**
 * Serialize a ServerNode tree to an HTML string. Void elements self-close,
 * text/attributes are escaped, style is emitted from cssText + camelCase props,
 * innerHTML is passed through verbatim.
 */
import { ServerNode, ServerElement, ServerText, ServerComment, ServerStyle } from './nodes.js';

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const AMP = /&/g;
const LT = /</g;
const GT = />/g;
const QUOT = /"/g;

function escapeText(s: string): string {
  return s.replace(AMP, '&amp;').replace(LT, '&lt;').replace(GT, '&gt;');
}
function escapeAttr(s: string): string {
  return s.replace(AMP, '&amp;').replace(QUOT, '&quot;');
}

function camelToKebab(k: string): string {
  // leave custom props (--var) and already-kebab keys alone
  if (k.startsWith('--')) return k;
  return k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

function serializeStyle(style: ServerStyle): string {
  const parts: string[] = [];
  if (style.cssText) parts.push(style.cssText.trim().replace(/;\s*$/, ''));
  for (const key of Object.keys(style)) {
    if (key === 'cssText') continue;
    const v = style[key];
    if (v == null || v === '') continue;
    parts.push(`${camelToKebab(key)}: ${v}`);
  }
  return parts.join('; ');
}

function serializeAttrs(el: ServerElement): string {
  let out = '';
  // style comes from the style object, not the attribute map, unless set as a
  // plain attribute string (setStyle uses cssText; spread style="..." → cssText).
  const inlineStyle = serializeStyle(el.style);
  for (const [name, value] of el.attributes) {
    if (name === 'style' && inlineStyle) continue; // style object wins / merges below
    out += ` ${name}="${escapeAttr(value)}"`;
  }
  if (inlineStyle) {
    const attrStyle = el.attributes.get('style');
    const merged = attrStyle ? `${attrStyle.replace(/;\s*$/, '')}; ${inlineStyle}` : inlineStyle;
    out += ` style="${escapeAttr(merged)}"`;
  }
  return out;
}

export function serializeNode(node: any): string {
  if (node == null || node === false || node === true) return '';
  if (typeof node === 'string') return escapeText(node);
  if (typeof node === 'number') return escapeText(String(node));
  // Accessors / memos / component thunks: the codegen returns a top-level memo
  // (createMemo(() => createComponent(...))). On the server reactivity is
  // render-once, so reading them here is safe and yields the built node tree.
  if (typeof node === 'function') return serializeNode(node());
  if (Array.isArray(node)) return node.map(serializeNode).join('');

  if (node instanceof ServerText) return escapeText(node.data);
  if (node instanceof ServerComment) return `<!--${node.data}-->`;

  if (node instanceof ServerElement) {
    const tag = node.localName;
    const open = `<${tag}${serializeAttrs(node)}>`;
    if (VOID_ELEMENTS.has(tag)) return open;
    const inner =
      node.rawHTML != null
        ? node.rawHTML
        : node.childNodes.map(serializeNode).join('');
    return `${open}${inner}</${tag}>`;
  }

  if (node instanceof ServerNode) {
    return node.childNodes.map(serializeNode).join('');
  }

  // Unknown value (e.g. a stray object) — render nothing rather than [object].
  return '';
}
