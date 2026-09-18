// The server seam the runtime imports from. Deliberately class-free so the
// ServerNode classes in ./nodes.ts stay out of client bundles, they get pulled
// in (and registered) only when @fluixi/dom/server loads.

// Stamped on every server node so the guards below can spot one without an
// instanceof against the (unbundled) classes.
export const SERVER_NODE: unique symbol = Symbol.for('fluixi.server-node');

// The mode and the node factory hang off the realm, not off this module.
//
// This file can exist twice. Each dist entry is bundled on its own, so `index.mjs` and
// `lib/dom/server-renderer.mjs` both carry a copy, and a bundler pulling in `@fluixi/dom`
// and `@fluixi/dom/server` gets two. With the flag as a module variable, renderToString
// flipped one and createNativeElement read the other, so a string render built real DOM
// and the serializer walked a NamedNodeMap expecting a Map. It only showed in a build:
// a dev server resolves both specifiers to the same source file.
const STATE: unique symbol = Symbol.for('fluixi.dom.server-host') as never;

interface HostState {
  server: boolean;
  nodes: ServerNodeFactory | null;
}

const realm = globalThis as unknown as Record<PropertyKey, HostState | undefined>;
const state: HostState = (realm[STATE] ??= {
  server: typeof document === 'undefined',
  nodes: null,
});

/**
 * Whether nodes should be built as strings rather than DOM.
 *
 * A function rather than a live binding: a second copy of this module would keep its own
 * binding, and the two would disagree for the whole of a render.
 */
export function isServer(): boolean {
  return state.server;
}

/**
 * Turn server mode on or off for this realm.
 *
 * `renderToString` owns this and restores the previous value, so it is rarely called
 * directly. A test that needs to exercise a server path is the exception.
 */
export function setServerMode(on: boolean): void {
  state.server = on;
}

export interface ServerNodeFactory {
  createElement(tag: string, isSVG: boolean): any;
  createText(value: string): any;
  createComment(value: string): any;
  /** A pre-rendered static subtree, serialized verbatim. */
  createRaw(html: string): any;
  /** A template with holes, parsed into real nodes so the holes can be filled. */
  parseTemplate(html: string, isSVG: boolean): any;
}

// Shared for the same reason as the mode: the subpath registers the factory and the main
// entry is the one that asks for it, and those can be two copies of this file.
export function registerServerNodes(factory: ServerNodeFactory): void {
  state.nodes = factory;
}

export function getServerNodes(): ServerNodeFactory {
  if (!state.nodes) {
    throw new Error('[fluixi] server render ran before @fluixi/dom/server loaded');
  }
  return state.nodes;
}

// Brand check for server nodes, instanceof for real DOM. On the client the brand
// branch just misses.
export function isDomNode(x: any): x is Node {
  if (x != null && x[SERVER_NODE] === true) return true;
  return typeof Node !== 'undefined' && x instanceof Node;
}
export function isDomElement(x: any): x is Element {
  if (x != null && x[SERVER_NODE] === true) return x.nodeType === 1;
  return typeof Element !== 'undefined' && x instanceof Element;
}
export function isDomText(x: any): x is Text {
  if (x != null && x[SERVER_NODE] === true) return x.nodeType === 3;
  return typeof Text !== 'undefined' && x instanceof Text;
}
