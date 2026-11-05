/** Tag/name classification tables. Kept free of any host (Babel/TS) types. */

/**
 * SVG element names, for `` html`` `` templates and the compiler's JSX alike: an element named
 * here is made in the SVG namespace wherever it is written, a fragment of `<defs>` returned
 * from a helper included. `a` and `title` are left out because HTML has them too: they are SVG
 * only inside an SVG parent. An `` svg`` `` root puts its whole subtree in SVG regardless.
 */
export const SVG_TAGS: ReadonlySet<string> = new Set([
  'svg', 'g', 'defs', 'symbol', 'use', 'switch', 'view', 'desc', 'metadata',
  'path', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'rect', 'image',
  'text', 'tspan', 'textPath',
  'linearGradient', 'radialGradient', 'stop', 'pattern', 'mask', 'clipPath', 'marker',
  'foreignObject',
  'animate', 'animateMotion', 'animateTransform', 'mpath', 'set',
  'filter', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
  'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow', 'feFlood',
  'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge',
  'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence',
]);

/** Elements whose content is text, not markup: don't descend into `<` inside. */
export const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

/** Void elements: no children, no close tag (`<input>`, `<br>`, ...). */
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
