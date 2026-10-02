/**
 * Server node model, a minimal, serialization-oriented stand-in for the DOM
 * Node/Element API that @fluixi/dom's runtime calls. Under server mode the leaf
 * factories (createNativeElement/createTextNode/createMarker) return these
 * instead of real DOM nodes, so insert/spread/Show/For run unchanged and the
 * result serializes to an HTML string. This is the "universal renderer" seam:
 * our runtime talks to nodes via methods, so we mock exactly those methods
 * (no jsdom). See ./serialize.ts for the string emitter.
 *
 * Only the surface the runtime actually uses is implemented (measured against
 * runtime.ts): the linked tree (parentNode/childNodes/*Sibling + append/insert/
 * remove/replace), attributes, the JSX_PROPERTIES properties (className/value/
 * checked/selected/innerHTML/textContent/innerText/htmlFor/indeterminate),
 * style, classList, and no-op event listeners.
 */

import { getOwner } from '@fluixi/reactive/signal';
import { SERVER_NODE } from './host.js';

// Where a custom element was created: the component, and the providers above it.
const OWNER_KEY = Symbol.for('fluixi.owner');

export const NODE_ELEMENT = 1;
export const NODE_TEXT = 3;
export const NODE_COMMENT = 8;

// ---------------------------------------------------------------------------
// Base node, the linked-tree mechanics insert() relies on.
// ---------------------------------------------------------------------------
/**
 * A custom element's content on the server. @fluixi/web-components registers a renderer under
 * this key; a server node with a dashed tag is handed to it once, when it is attached to its
 * parent (its props and children are complete by then) or, failing that, when serialized.
 */
const ELEMENT_RENDERER = Symbol.for('fluixi.serverElementRenderer');
const RENDERED = Symbol.for('fluixi.serverElementRendered');

export function renderServerElement(node: ServerNode): void {
  if (node.nodeType !== NODE_ELEMENT) return;
  const element = node as unknown as ServerElement & Record<symbol, unknown>;
  // Some element-like nodes (a portal target, a fragment stand-in) carry no tag name.
  if (typeof element.localName !== 'string' || !element.localName.includes('-') || element[RENDERED]) return;
  const renderer = (globalThis as Record<symbol, unknown>)[ELEMENT_RENDERER] as ((node: ServerElement) => void) | undefined;
  if (!renderer) return;
  element[RENDERED] = true;
  renderer(element);
}

export abstract class ServerNode {
  // Brand the host.ts guards check for (lets them skip an instanceof on these classes).
  readonly [SERVER_NODE] = true;
  abstract nodeType: number;
  parentNode: ServerElement | null = null;
  childNodes: ServerNode[] = [];

  get firstChild(): ServerNode | null {
    return this.childNodes[0] ?? null;
  }
  get lastChild(): ServerNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }
  get nextSibling(): ServerNode | null {
    const p = this.parentNode;
    if (!p) return null;
    const i = p.childNodes.indexOf(this);
    return i >= 0 ? p.childNodes[i + 1] ?? null : null;
  }
  get previousSibling(): ServerNode | null {
    const p = this.parentNode;
    if (!p) return null;
    const i = p.childNodes.indexOf(this);
    return i > 0 ? p.childNodes[i - 1] ?? null : null;
  }
  get parentElement(): ServerElement | null {
    return this.parentNode;
  }

  appendChild<T extends ServerNode>(child: T): T {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this as unknown as ServerElement;
    this.childNodes.push(child);
    renderServerElement(child);
    return child;
  }

  insertBefore<T extends ServerNode>(child: T, ref: ServerNode | null): T {
    if (ref == null) return this.appendChild(child);
    if (child.parentNode) child.parentNode.removeChild(child);
    const i = this.childNodes.indexOf(ref);
    child.parentNode = this as unknown as ServerElement;
    if (i < 0) this.childNodes.push(child);
    else this.childNodes.splice(i, 0, child);
    renderServerElement(child);
    return child;
  }

  removeChild<T extends ServerNode>(child: T): T {
    const i = this.childNodes.indexOf(child);
    if (i >= 0) this.childNodes.splice(i, 1);
    child.parentNode = null;
    return child;
  }

  replaceChild<T extends ServerNode>(next: ServerNode, old: T): T {
    const i = this.childNodes.indexOf(old);
    if (i >= 0) {
      if (next.parentNode) next.parentNode.removeChild(next);
      next.parentNode = this as unknown as ServerElement;
      this.childNodes[i] = next;
      old.parentNode = null;
      renderServerElement(next);
    }
    return old;
  }

  // Event listeners are inert on the server.
  addEventListener(): void {}
  removeEventListener(): void {}
}

// ---------------------------------------------------------------------------
// Text + Comment
// ---------------------------------------------------------------------------
export class ServerText extends ServerNode {
  nodeType = NODE_TEXT;
  data: string;
  constructor(value: string) {
    super();
    this.data = value;
  }
  get nodeValue(): string {
    return this.data;
  }
  set nodeValue(v: string) {
    this.data = v == null ? '' : String(v);
  }
  get textContent(): string {
    return this.data;
  }
  set textContent(v: string) {
    this.data = v == null ? '' : String(v);
  }
  cloneNode(): ServerText {
    return new ServerText(this.data);
  }
}

/**
 * A pre-rendered subtree, serialized verbatim.
 *
 * Static markup the compiler turned into a template arrives as an HTML string. On the
 * client it is parsed once and cloned; on the server there is nothing to gain from
 * parsing it into elements only to serialize them straight back, so it is carried as-is
 * and written out. `serializeNode` checks `rawOuterHTML` before anything else.
 */
export class ServerRaw extends ServerNode {
  nodeType = NODE_ELEMENT;
  rawOuterHTML: string;
  constructor(html: string) {
    super();
    this.rawOuterHTML = html;
  }
  get textContent(): string {
    // Approximate: strip tags. Only used by diagnostics, never for output.
    return this.rawOuterHTML.replace(/<[^>]*>/g, '');
  }
  cloneNode(): ServerRaw {
    return new ServerRaw(this.rawOuterHTML);
  }
}

export class ServerComment extends ServerNode {
  nodeType = NODE_COMMENT;
  data: string;
  constructor(value: string) {
    super();
    this.data = value;
  }
  get nodeValue(): string {
    return this.data;
  }
  set nodeValue(v: string) {
    this.data = v == null ? '' : String(v);
  }
  cloneNode(): ServerComment {
    return new ServerComment(this.data);
  }
}

// ---------------------------------------------------------------------------
// style + classList helpers (runtime sets element.style.cssText, element.style
// .camelKey, and element.classList.toggle/add/remove/contains).
// ---------------------------------------------------------------------------
export class ServerStyle {
  // declared keys are stored as own props; cssText holds a raw string blob.
  cssText = '';
  [key: string]: any;
  setProperty(name: string, value: string): void {
    this[name] = value;
  }
  removeProperty(name: string): void {
    delete this[name];
  }
}

class ServerClassList {
  constructor(private el: ServerElement) {}
  private list(): string[] {
    const c = this.el.getAttribute('class');
    return c ? c.split(/\s+/).filter(Boolean) : [];
  }
  private write(arr: string[]): void {
    if (arr.length) this.el.setAttribute('class', arr.join(' '));
    else this.el.removeAttribute('class');
  }
  add(...names: string[]): void {
    const arr = this.list();
    for (const n of names) if (!arr.includes(n)) arr.push(n);
    this.write(arr);
  }
  remove(...names: string[]): void {
    this.write(this.list().filter((c) => !names.includes(c)));
  }
  contains(name: string): boolean {
    return this.list().includes(name);
  }
  toggle(name: string, force?: boolean): boolean {
    const has = this.contains(name);
    const on = force === undefined ? !has : force;
    if (on) this.add(name);
    else this.remove(name);
    return on;
  }
}

// ---------------------------------------------------------------------------
// Element: attributes + the JSX_PROPERTIES properties + style/classList.
// ---------------------------------------------------------------------------
export class ServerElement extends ServerNode {
  nodeType = NODE_ELEMENT;
  localName: string;
  tagName: string;
  isSVG: boolean;
  namespaceURI: string | null;
  attributes = new Map<string, string>();
  style = new ServerStyle();
  classList: ServerClassList = new ServerClassList(this);
  /** raw HTML set via innerHTML: emitted verbatim, bypassing childNodes. */
  rawHTML: string | null = null;

  constructor(tag: string, isSVG = false) {
    super();
    this.localName = tag.toLowerCase();
    this.tagName = isSVG ? tag : tag.toUpperCase();
    this.isSVG = isSVG;
    this.namespaceURI = isSVG ? 'http://www.w3.org/2000/svg' : null;
    // A custom element renders later, when attached or serialized, by which point the component
    // that made it is no longer the current scope. It renders under this one, so it reads the
    // app's context on the server as it does after hydration in the browser.
    if (this.localName.includes('-')) {
      const owner = getOwner();
      if (owner) (this as unknown as Record<symbol, unknown>)[OWNER_KEY] = owner;
    }
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  getAttribute(name: string): string | null {
    return this.attributes.has(name) ? this.attributes.get(name)! : null;
  }
  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  get id(): string {
    return this.getAttribute('id') ?? '';
  }
  set id(v: string) {
    if (v == null) this.removeAttribute('id');
    else this.setAttribute('id', v);
  }

  // JSX_PROPERTIES: className/value/checked/selected/innerHTML/innerText/
  // textContent/indeterminate/htmlFor flow through setProperty (element[k]=v).
  get className(): string {
    return this.getAttribute('class') ?? '';
  }
  set className(v: string) {
    if (v == null) this.removeAttribute('class');
    else this.setAttribute('class', v);
  }
  get htmlFor(): string {
    return this.getAttribute('for') ?? '';
  }
  set htmlFor(v: string) {
    if (v == null) this.removeAttribute('for');
    else this.setAttribute('for', v);
  }
  set value(v: any) {
    if (v == null) this.removeAttribute('value');
    else this.setAttribute('value', String(v));
  }
  set checked(v: any) {
    if (v) this.setAttribute('checked', '');
    else this.removeAttribute('checked');
  }
  set selected(v: any) {
    if (v) this.setAttribute('selected', '');
    else this.removeAttribute('selected');
  }
  // indeterminate is a live-only DOM property with no HTML serialization.
  set indeterminate(_v: any) {}

  get textContent(): string {
    return this.childNodes.map((c) => (c as any).textContent ?? '').join('');
  }
  set textContent(v: string) {
    for (const c of this.childNodes) c.parentNode = null;
    this.childNodes = [];
    this.rawHTML = null;
    if (v != null && v !== '') this.appendChild(new ServerText(String(v)));
  }
  set innerText(v: string) {
    this.textContent = v;
  }
  set innerHTML(v: string) {
    for (const c of this.childNodes) c.parentNode = null;
    this.childNodes = [];
    this.rawHTML = v == null ? '' : String(v);
  }

  cloneNode(deep = false): ServerElement {
    const el = new ServerElement(this.localName, this.isSVG);
    el.attributes = new Map(this.attributes);
    el.style.cssText = this.style.cssText;
    el.rawHTML = this.rawHTML;
    if (deep) for (const c of this.childNodes) el.appendChild((c as any).cloneNode(true));
    return el;
  }
}

// Server-only; serialize.ts uses it. The client-facing guards are in host.ts.
export function isServerNodeValue(x: any): x is ServerNode {
  return x instanceof ServerNode;
}
