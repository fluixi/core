/**
 * Accessibility rules over the template AST.
 *
 * These live in the parser, not in a consumer, because both the language service
 * and the compiler already parse templates: a rule written here reaches the
 * editor and the build from one implementation.
 *
 * Every rule is structural: no types, no scope analysis, no guessing. A rule that
 * cannot be certain stays silent, because an accessibility warning that cries wolf
 * gets switched off and then the real ones are lost too. That is why anything
 * carrying a spread is skipped: the spread may supply the very attribute the rule
 * is looking for, and there is no way to know from the template alone.
 */
import type {
  AttributeLikeNode,
  Diagnostic,
  ElementNode,
  RootNode,
  TemplateNode,
} from './ast.js';

/** Elements that are focusable and clickable without help. */
const INTERACTIVE = new Set([
  'a', 'button', 'input', 'select', 'textarea', 'summary', 'details', 'option', 'label',
]);

/** Keyboard events that make a click handler reachable without a mouse. */
const KEY_EVENTS = new Set(['keydown', 'keyup', 'keypress']);

function attributeNamed(node: ElementNode, name: string): AttributeLikeNode | undefined {
  return node.attributes.find((a) => 'name' in a && a.name === name);
}

function hasSpread(node: ElementNode): boolean {
  return node.attributes.some((a) => a.kind === 'Spread');
}

/** The literal value of a static attribute, when it has one. */
function staticValue(node: ElementNode, name: string): string | undefined {
  const attribute = attributeNamed(node, name);
  if (!attribute || attribute.kind !== 'Attribute' || !attribute.value) return undefined;
  const value = attribute.value;
  return value.kind === 'static' ? value.value : undefined;
}

/** True when the element is explicitly removed from the accessibility tree. */
function isPresentational(node: ElementNode): boolean {
  const role = staticValue(node, 'role');
  if (role === 'presentation' || role === 'none') return true;
  return staticValue(node, 'aria-hidden') === 'true';
}

function hasEvent(node: ElementNode, predicate: (name: string) => boolean): boolean {
  return node.attributes.some((a) => a.kind === 'EventBinding' && predicate(a.name));
}

/**
 * Collect accessibility diagnostics for a parsed template.
 *
 * Reported as warnings: they describe a real barrier, but none of them make the
 * template invalid, and failing a build on them would be the wrong trade.
 */
export function checkAccessibility(root: RootNode): Diagnostic[] {
  const out: Diagnostic[] = [];

  const report = (node: ElementNode, code: Diagnostic['code'], message: string): void => {
    out.push({ code, message, severity: 'warning', loc: node.loc });
  };

  const visit = (nodes: readonly TemplateNode[]): void => {
    for (const node of nodes) {
      if (node.kind === 'Element') check(node as ElementNode, report);
      const children = 'children' in node ? (node.children as TemplateNode[] | undefined) : undefined;
      if (children) visit(children);
    }
  };

  visit(root.children);
  return out;
}

function check(
  node: ElementNode,
  report: (node: ElementNode, code: Diagnostic['code'], message: string) => void,
): void {
  // A spread may carry any of the attributes below, so nothing can be concluded.
  if (hasSpread(node)) return;

  const tag = node.tag.toLowerCase();

  // An image with no text alternative is invisible to a screen reader. An empty
  // `alt` is correct for decoration, so only a missing attribute is reported.
  if (tag === 'img' && !attributeNamed(node, 'alt') && !isPresentational(node)) {
    report(node, 'a11y-img-alt', 'An `img` needs an `alt`. Use `alt=""` when the image is decorative.');
  }

  // An anchor without a destination isn't a link; it isn't focusable or
  // announced as one. A button is almost always what was meant.
  if (tag === 'a' && !attributeNamed(node, 'href') && !attributeNamed(node, 'role')) {
    report(node, 'a11y-anchor-href', 'An `a` without `href` is not a link. Use a `button` for an action.');
  }

  if (tag === 'iframe' && !attributeNamed(node, 'title')) {
    report(node, 'a11y-iframe-title', 'An `iframe` needs a `title` describing its content.');
  }

  // A positive tabindex overrides document order for the whole page, not just
  // this element: the classic way to make keyboard navigation unpredictable.
  const tabindex = staticValue(node, 'tabindex') ?? staticValue(node, 'tabIndex');
  if (tabindex !== undefined && Number(tabindex) > 0) {
    report(
      node,
      'a11y-positive-tabindex',
      'A positive `tabindex` reorders tab navigation for the entire page. Use `0`, or restructure the markup.',
    );
  }

  // A click handler on a plain element is mouse-only: not focusable, not
  // activatable by keyboard, and not announced as interactive.
  if (
    !INTERACTIVE.has(tag) &&
    hasEvent(node, (name) => name === 'click') &&
    !attributeNamed(node, 'role') &&
    !hasEvent(node, (name) => KEY_EVENTS.has(name))
  ) {
    report(
      node,
      'a11y-click-without-keyboard',
      `A click handler on \`${tag}\` is unreachable by keyboard. Use a \`button\`, or add a \`role\` and a key handler.`,
    );
  }
}
