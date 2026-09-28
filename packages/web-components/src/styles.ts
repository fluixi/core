/**
 * Shadow root styles, shared across instances.
 *
 * A `<style>` per instance parses the same CSS once for every element on the page. A
 * constructed `CSSStyleSheet` is parsed once and adopted by every shadow root that uses
 * it, so a list of a hundred rows costs one sheet. Where `adoptedStyleSheets` is missing
 * (older engines, jsdom) the text goes in a `<style>` as before.
 */

/**
 * What `static styles` takes: CSS text, a constructed sheet, or a list of them, nested.
 * The list is how a subclass keeps its parent's: `static styles = [super.styles, '…']`.
 * `undefined`, `null` and `false` in a list are skipped, so an absent parent is fine.
 */
export type ElementStyles = string | CSSStyleSheet | readonly (ElementStyles | undefined | null | false)[];

/** One sheet per distinct CSS text, so a parent's styles are shared by its subclasses. */
const sheets = new Map<string, CSSStyleSheet>();
/** The flattened list per class, resolved on its first instance. */
const resolved = new WeakMap<object, (string | CSSStyleSheet)[]>();

function flatten(styles: ElementStyles | undefined | null | false, out: (string | CSSStyleSheet)[]): (string | CSSStyleSheet)[] {
  if (!styles) return out;
  if (typeof styles === 'string' || !Array.isArray(styles)) out.push(styles as string | CSSStyleSheet);
  else for (const entry of styles) flatten(entry, out);
  return out;
}

function sheetFor(css: string): CSSStyleSheet {
  let sheet = sheets.get(css);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    sheets.set(css, sheet);
  }
  return sheet;
}

/** Checked per call: cheap, and a test can stub either side. */
function canAdopt(root: ShadowRoot): boolean {
  return typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype && 'adoptedStyleSheets' in root;
}

/** Apply a class's styles to one of its shadow roots. */
export function applyStyles(root: ShadowRoot, owner: object, styles: ElementStyles | undefined): void {
  let list = resolved.get(owner);
  if (!list) resolved.set(owner, (list = flatten(styles, [])));
  if (!list.length) return;

  if (canAdopt(root)) {
    // Appended, so sheets a declarative shadow root or a mixin adopted first stay.
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, ...list.map((s) => (typeof s === 'string' ? sheetFor(s) : s))];
    return;
  }
  for (const entry of list) {
    const style = document.createElement('style');
    style.textContent = typeof entry === 'string' ? entry : Array.from(entry.cssRules, (rule) => rule.cssText).join('\n');
    root.appendChild(style);
  }
}
