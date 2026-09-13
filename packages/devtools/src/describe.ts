// A dom node, in words.
//
// The element is described at the moment it is reported and the reference dropped: holding
// one would keep a removed subtree alive for as long as the panel is open.
//
// Enough to find it on the page — tag, id, a class or two — without being a selector.

/** More than this is a selector, not a label. */
const MAX_CLASSES = 2;

/** `text in li` — the element it sits in is what locates it. */
function textOwner(node: Node): string {
  const parent = node.parentElement;
  return parent ? `text in ${describeElement(parent)}` : 'text';
}

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  // Not a string on an SVG element.
  const raw = typeof el.className === 'string' ? el.className : el.getAttribute('class') ?? '';
  const classes = raw
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_CLASSES)
    .map((c) => `.${c}`)
    .join('');
  return `${tag}${id}${classes}`;
}

/** An element, the text node it writes, or the marker for a hole with nothing in it yet. */
export function describeNode(target: unknown): string {
  const node = target as Node | null | undefined;
  if (!node || typeof (node as Node).nodeType !== 'number') return 'detached';
  switch (node.nodeType) {
    case 1:
      return describeElement(node as Element);
    case 3:
      return textOwner(node);
    case 8: {
      // The hole is empty; where it will go is what matters.
      const parent = node.parentElement;
      return parent ? `slot in ${describeElement(parent)}` : 'slot';
    }
    case 11:
      return 'fragment';
    default:
      return node.nodeName?.toLowerCase() ?? 'node';
  }
}
