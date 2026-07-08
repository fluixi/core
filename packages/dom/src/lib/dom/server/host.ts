// The server seam the runtime imports from. Deliberately class-free so the
// ServerNode classes in ./nodes.ts stay out of client bundles — they get pulled
// in (and registered) only when @fluixi/dom/server loads.

// Live binding; renderToString and jsdom tests flip it via setServerMode.
export let isServer = typeof document === 'undefined';
export function setServerMode(on: boolean): void {
  isServer = on;
}

// Stamped on every server node so the guards below can spot one without an
// instanceof against the (unbundled) classes.
export const SERVER_NODE: unique symbol = Symbol.for('fluixi.server-node');

export interface ServerNodeFactory {
  createElement(tag: string, isSVG: boolean): any;
  createText(value: string): any;
  createComment(value: string): any;
}

let _nodes: ServerNodeFactory | null = null;

export function registerServerNodes(factory: ServerNodeFactory): void {
  _nodes = factory;
}

export function getServerNodes(): ServerNodeFactory {
  if (!_nodes) {
    throw new Error('[fluixi] server render ran before @fluixi/dom/server loaded');
  }
  return _nodes;
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
