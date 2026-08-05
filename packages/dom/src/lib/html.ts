/**
 * `` html`...` `` / `` svg`...` `` — the compile-time template markers.
 *
 * These are the no-JSX authoring surface: the @fluixi/compiler (`format: 'lit'`)
 * replaces every `` html`...` `` call at build time with the SAME direct
 * @fluixi/dom runtime calls that JSX produces, so these functions never actually
 * run. They exist for types and as a guard — if one executes, the lit format
 * wasn't enabled in the build.
 *
 * They live in @fluixi/dom (the runtime the compiler targets) so any tier can
 * import them; @fluixi/core re-exports them for convenience.
 */

import type { ComponentChild } from './shared/types.js';

/**
 * What a compiled `` html`...` `` evaluates to at runtime: a DOM node, or — when
 * the template's root is a control-flow component — the reactive memo the runtime
 * inserts. `render()`/`insert()` accept both shapes.
 *
 * The memo returns a `ComponentChild`, not `unknown`: an html`` template has to be
 * usable everywhere a renderable value is expected, and `() => unknown` was not
 * assignable to one — so a component authored with html`` failed to typecheck as
 * a `Component`.
 */
export type TemplateResult = Node | (() => ComponentChild);

/** A reactive value: a plain value or an accessor the compiler wires up. */
export type Reactive<T> = T | (() => T);

/** The `html` template tag. Compiled away by `fluixi({ format: 'lit' })`. */
export function html(_strings: TemplateStringsArray, ..._values: unknown[]): TemplateResult {
  throw new Error("html`` was not compiled — enable the lit format: fluixi({ format: 'lit' }).");
}

/** Same as `html`, but the subtree is created in the SVG namespace. */
export function svg(_strings: TemplateStringsArray, ..._values: unknown[]): TemplateResult {
  throw new Error("svg`` was not compiled — enable the lit format: fluixi({ format: 'lit' }).");
}
