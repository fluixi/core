/** Tag/name classification tables. Kept free of any host (Babel/TS) types. */

/**
 * Tags placed in the SVG namespace by name in an `` html`` `` template. An
 * `` svg`` `` root puts its whole subtree in SVG regardless. Kept identical to
 * the compiler's `SVG_TAGS` so lowering stays byte-identical.
 */
export const SVG_TAGS = new Set([
  'svg', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline',
  'ellipse', 'g', 'defs', 'clipPath', 'text',
]);

/** Elements whose content is text, not markup — don't descend into `<` inside. */
export const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

/** Void elements: no children, no close tag (`<input>`, `<br>`, …). */
export const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** Events wired through the delegated listener (matches the compiler set). */
export const DELEGATED_EVENTS = new Set([
  'click', 'dblclick', 'input', 'change', 'submit', 'focus', 'blur',
  'keydown', 'keyup', 'keypress', 'mousedown', 'mouseup',
]);

/** A tag is a component when capitalized or a member path (`Ctx.Provider`). */
export function isComponentTag(tag: string): boolean {
  return tag.length > 0 && (tag[0] !== tag[0].toLowerCase() || tag.includes('.'));
}
