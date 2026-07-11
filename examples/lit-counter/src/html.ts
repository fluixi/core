/**
 * The `html` tag you author templates with. The @fluixi/vite-plugin (format:
 * 'lit') replaces every `` html`...` `` call at compile time with direct
 * @fluixi/dom runtime calls, so this function never runs — it's here for types
 * and as a guard: if it ever executes, compilation wasn't wired up.
 */
export function html(_strings: TemplateStringsArray, ..._values: unknown[]): Node {
  throw new Error(
    "html`` was not compiled — enable the lit format: fluixi({ format: 'lit' }).",
  );
}
