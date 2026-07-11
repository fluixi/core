import type { TemplateResult } from './types.js';

/**
 * The `html` tag. The @fluixi/compiler (`format: 'lit'`) replaces every
 * `` html`...` `` call at build time with direct @fluixi/dom runtime calls, so
 * this function never runs — it's here for types and as a guard: if it executes,
 * the lit format wasn't enabled.
 */
export function html(_strings: TemplateStringsArray, ..._values: unknown[]): TemplateResult {
  throw new Error(
    "html`` was not compiled — enable the lit format: fluixi({ format: 'lit' }).",
  );
}

/** Same as `html`, but the subtree is created in the SVG namespace. */
export function svg(_strings: TemplateStringsArray, ..._values: unknown[]): TemplateResult {
  throw new Error(
    "svg`` was not compiled — enable the lit format: fluixi({ format: 'lit' }).",
  );
}
