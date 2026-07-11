/**
 * Types for html`` authoring. Kept dependency-free — the values here are what
 * you interpolate into a template and what a compiled template evaluates to.
 */

/**
 * What a compiled `` html`...` `` evaluates to at runtime: a DOM node, or — when
 * the template's root is a control-flow component — the reactive memo the runtime
 * inserts. Loose on purpose; `render()`/`insert()` accept both shapes.
 */
export type TemplateResult = Node | (() => unknown);

/** A reactive value: a plain value or an accessor the compiler wires up. */
export type Reactive<T> = T | (() => T);
