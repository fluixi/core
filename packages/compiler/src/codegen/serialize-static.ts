/**
 * Serialize a static IR subtree to the HTML a `<template>` can be built from.
 *
 * Only called for nodes `analyzeStatic` marked static, so every prop is a literal and
 * every child is text or another static element: there is nothing here that could need
 * an expression. That invariant is what makes this safe: the serializer never has to
 * guess, and anything it cannot represent is a bug in the analysis, not a fallback.
 */
import type { IRElement, IRNode, IRProp } from '../ir/nodes.js';

/** Elements the HTML parser closes itself; emitting `</br>` would create a second node. */
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

/**
 * Attribute names the IR normalises away from their HTML spelling. Serializing to HTML
 * means going back: a template is parsed by the browser, which knows `class`, not
 * `className`.
 */
const HTML_NAME: Record<string, string> = {
  className: 'class',
  htmlFor: 'for',
};

/**
 * Names the runtime assigns as DOM properties, whatever they look like.
 *
 * `innerHTML="<b>x</b>"` in a template would be escaped into visible text, and `value`
 * as an attribute sets the *default* value rather than the current one. Serializing any
 * of these changes what the code means, so they stay on the imperative path.
 */
export const PROPERTY_ONLY = new Set([
  'innerHTML',
  'outerHTML',
  'innerText',
  'textContent',
  'value',
  'checked',
  'selected',
  'muted',
  'defaultValue',
  'defaultChecked',
  'children',
  'ref',
]);

/**
 * Elements whose content the HTML parser does not decode entities inside.
 *
 * Escaping `>` in a `<style>` body would leave a literal `&gt;` in the CSS rather than
 * the character. There is nothing to gain from templating these, their content is the
 * interesting part, not their structure: so they stay on the imperative path.
 */
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

/** True when this element's content must not be entity-escaped. */
export function isRawTextElement(tag: string): boolean {
  return RAW_TEXT_ELEMENTS.has(tag);
}

/** The HTML spelling of an IR prop name. */
export function htmlAttrName(name: string): string {
  return HTML_NAME[name] ?? name;
}

/**
 * True for a prop that is a plain HTML attribute with a compile-time constant value , 
 * safe to write straight onto the element, with no runtime interpretation.
 */
export function isPlainLiteralAttr(prop: IRProp): boolean {
  if (prop.kind !== 'attr') return false;
  if (prop.expr !== undefined) return false;
  if (prop.name.includes(':')) return false;
  return !PROPERTY_ONLY.has(prop.name);
}

/** True when the subtree can be represented as HTML text with no loss. */
export function isSerializable(node: IRElement): boolean {
  if (!node.static) return false;
  if (isRawTextElement(node.tag)) return false;
  // Nothing may end up needing an expression once inside the template.
  for (const prop of node.props) {
    // Namespaced names (`prop:value`, `attr:x`, `bool:disabled`, `on:click`) are
    // instructions to the runtime, not HTML, and property-only names are assigned
    // rather than set: both stay on the imperative path.
    if (!isPlainLiteralAttr(prop)) return false;
  }
  for (const child of node.children) {
    if (child.kind === 'text') continue;
    if (child.kind === 'element' && isSerializable(child)) continue;
    return false;
  }
  return true;
}

/** The subtree as HTML. */
export function serializeStatic(node: IRElement): string {
  const attrs = node.props.map(serializeProp).filter(Boolean).join('');
  const open = `<${node.tag}${attrs}>`;
  if (VOID_ELEMENTS.has(node.tag)) return open;
  return `${open}${node.children.map(serializeChild).join('')}</${node.tag}>`;
}

function serializeChild(child: IRNode): string {
  if (child.kind === 'text') return escapeText(child.value);
  /* c8 ignore next */
  if (child.kind !== 'element') throw new Error(`serializeStatic: unexpected ${child.kind}`);
  return serializeStatic(child);
}

function serializeProp(prop: IRProp): string {
  const name = HTML_NAME[prop.name] ?? prop.name;
  const value = prop.literal;
  // A valueless attribute (`disabled`) is `true` in the IR and bare in HTML.
  if (value === true || value === undefined) return ` ${name}`;
  if (value === false || value === null) return '';
  return ` ${name}="${escapeAttr(String(value))}"`;
}

/**
 * Escaping is deliberately aggressive. This string is assigned to `innerHTML`, so a
 * literal that happens to contain markup would otherwise become elements, a value like
 * `class="a<b"` must stay one attribute.
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Where each element of a template was written, in the order a clone walks them.
 *
 * A template is emitted as one string, so a source map traces everything in it back to the
 * line the root opens at: every element in a component reports the same place. The order
 * is pre-order over the elements the template contains, which is what
 * `[root, ...root.querySelectorAll('*')]` gives back on the clone, since holes are filled
 * only after it is built.
 *
 * Undefined when the transform was not asked for source locations, so a production build
 * emits nothing and pays nothing.
 */
export function templatePositions(root: IRElement): { file: string; pos: number[] } | undefined {
  const pos: number[] = [];
  let file: string | undefined;
  const walk = (el: IRElement): void => {
    file ??= el.at?.file;
    pos.push(el.at?.line ?? 0, el.at?.column ?? 0);
    for (const child of el.children) if (child.kind === 'element') walk(child);
  };
  walk(root);
  return file && pos.some((n) => n !== 0) ? { file, pos } : undefined;
}
