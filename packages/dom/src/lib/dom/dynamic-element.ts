/**
 * Build an element or component from a type known only at runtime.
 *
 * This is what a polymorphic `as` prop needs and what JSX syntax cannot express:
 * you can write `<div>` or `<Comp>`, but not `<{value}>`. The automatic JSX
 * runtime has always had this logic; it lived there only because JSX happened to
 * be its first caller.
 *
 * It belongs in dom. Both authoring modes compile to the same dom calls, so an
 * `as`-polymorphic component shouldn't have to depend on `@fluixi/jsx` — which it
 * did, making `@fluixi/jsx` a runtime dependency of every component library built
 * on `as`, including for apps that only ever write html`` templates.
 *
 * One implementation, so the two paths can't drift the way `spread` and
 * `applyProps` did.
 */
import { applyProps, insert, isSVGElement } from './runtime.js';
import { createComponent } from './integration.js';
import { isServer, getServerNodes } from './server/host.js';
import { readChildren } from '@fluixi/reactive/signal';
import { SVG_NAMESPACE } from './utils.js';

/** A tag name, or a component function. */
export type DynamicType = string | ((props: any) => any);

/**
 * Create a node for `type` with `props`.
 *
 * A string builds a native element (SVG-aware) and inserts its children; a
 * function is instantiated as a component.
 */
export function createDynamicElement(type: DynamicType, props: Record<string, any> = {}): any {
  if (typeof type === 'function') return createComponent(type, props);
  if (typeof type !== 'string' || type.length === 0) return null;

  const svgTag = isSVGElement(type);
  if (isServer) return getServerNodes().createElement(type, svgTag);

  const element = svgTag
    ? document.createElementNS(SVG_NAMESPACE, type)
    : document.createElement(type);

  applyProps(element, props, svgTag);
  insertChildren(element, props);
  return element;
}

/**
 * Insert `props.children`, read through `readChildren` so a lazy `get children()`
 * — which is how the compiler emits component children — resolves here rather
 * than being materialised early.
 */
function insertChildren(element: Element, props: Record<string, any>): void {
  if (!props || props.children === undefined) return;

  const children = readChildren(() => props.children);
  const insertOne = (child: unknown): void => {
    // A function child is reactive and needs an anchor to update in place;
    // a static one is appended directly.
    insert(element, child as never, (typeof child === 'function' ? null : undefined) as never);
  };

  if (Array.isArray(children)) children.forEach(insertOne);
  else insertOne(children);
}
