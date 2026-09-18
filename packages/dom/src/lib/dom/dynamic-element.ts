/**
 * Build an element or component from a type known only at runtime.
 *
 * This is what a polymorphic `as` prop needs and what JSX syntax cannot express:
 * you can write `<div>` or `<Comp>`, but not `<{value}>`. The automatic JSX
 * runtime has always had this logic; it lived there only because JSX happened to
 * be its first caller.
 *
 * It belongs in dom. Both authoring modes compile to the same dom calls, so an
 * `as`-polymorphic component shouldn't have to depend on `@fluixi/jsx`, which it
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
 * The element a tag name builds: the exact interface for a known HTML or SVG tag,
 * and `Element` for a custom-element name we can't know statically.
 *
 * HTML is checked first because a few names (`a`, `script`, `style`, `title`) are
 * in both maps, and the HTML one is what an unqualified tag means.
 */
type ElementFor<T extends string> = T extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[T]
  : T extends keyof SVGElementTagNameMap
    ? SVGElementTagNameMap[T]
    : Element;

/**
 * What `createDynamicElement` returns for a given type: a component's own return
 * type, or the element its tag name builds.
 *
 * Distributes over a union, so a polymorphic `as?: string | Component` yields the
 * union of both rather than collapsing, which is what keeps `as` from being a
 * hole in the type system.
 */
export type DynamicResult<T extends DynamicType> = T extends (props: any) => infer R
  ? R
  : T extends string
    ? ElementFor<T>
    : never;

/**
 * Build-time guards. `as` is the one place a component library hands the type
 * system a runtime value, so if inference regresses to `any` here it takes every
 * polymorphic component's props with it: silently.
 */
type Assert<T extends true> = T;
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;
/** What an actual call returns, asserting the alias alone would miss a signature
 *  regressed back to `any`, which is the regression that matters. */
type Returns<T extends DynamicType> = ReturnType<typeof createDynamicElement<T>>;

export type DynamicResultIsInferred = [
  Assert<Equals<Returns<'div'>, HTMLDivElement>>,
  Assert<Equals<Returns<'a'>, HTMLAnchorElement>>, // in both maps; HTML wins
  Assert<Equals<Returns<'circle'>, SVGCircleElement>>,
  Assert<Equals<Returns<'my-widget'>, Element>>,
  Assert<Equals<Returns<() => HTMLButtonElement>, HTMLButtonElement>>,
];

/**
 * Create a node for `type` with `props`.
 *
 * A string builds a native element (SVG-aware) and inserts its children; a
 * function is instantiated as a component.
 */
export function createDynamicElement<T extends DynamicType>(
  type: T,
  props: Record<string, any> = {},
): DynamicResult<T> {
  // The body works in erased terms; only the signature is precise, so each return
  // is cast back to the conditional type TS can't verify structurally.
  type Result = DynamicResult<T>;

  if (typeof type === 'function') return createComponent(type, props) as Result;
  if (typeof type !== 'string' || type.length === 0) return null as Result;

  const svgTag = isSVGElement(type);
  if (isServer()) return getServerNodes().createElement(type, svgTag) as Result;

  const element = svgTag
    ? document.createElementNS(SVG_NAMESPACE, type)
    : document.createElement(type);

  applyProps(element, props, svgTag);
  insertChildren(element, props);
  return element as Result;
}

/**
 * Insert `props.children`, read through `readChildren` so a lazy `get children()`
 *, which is how the compiler emits component children, resolves here rather
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
