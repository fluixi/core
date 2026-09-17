/**
 * Named references to elements inside the component, the Catalyst idea.
 *
 * `targets.content` finds `[data-target="content"]` in the component's own root. The
 * point is not to save typing over `querySelector`, it is that the name is declarative
 * and appears in the markup, so a reader can see what the code will reach for.
 *
 * This is the runtime answer, and it is a real query. Fluixi already has a compile-time
 * one: `ref=${assign}` in a template hands the element over as it is created, with no
 * lookup at all. Prefer `ref` inside a Fluixi template; targets are for markup this
 * component did not author, which in light DOM includes everything the page supplied.
 *
 * Nothing is cached. A cache would need invalidating on every reactive update, and the
 * bookkeeping to do that correctly costs more than the query it saves. Reach for a
 * target when you need it rather than holding one.
 */

export interface Targets {
  /** First `[data-target="name"]` inside the root, or null. */
  get<T extends Element = HTMLElement>(name: string): T | null;
  /** Every `[data-target="name"]` inside the root, in document order. */
  all<T extends Element = HTMLElement>(name: string): T[];
  /** Like `get`, but says which name was missing instead of returning null. */
  require<T extends Element = HTMLElement>(name: string): T;
}

function selector(name: string): string {
  // The name reaches a selector, so it has to survive one. CSS.escape is in every
  // browser that has custom elements; jsdom has it too.
  const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(name) : name;
  return `[data-target="${escaped}"]`;
}

export function createTargets(root: () => ParentNode): Targets {
  return {
    get: <T extends Element>(name: string) => root().querySelector(selector(name)) as T | null,
    all: <T extends Element>(name: string) =>
      Array.from(root().querySelectorAll(selector(name))) as T[],
    require: <T extends Element>(name: string) => {
      const found = root().querySelector(selector(name)) as T | null;
      if (found) return found;
      throw new Error(
        `[fluixi] no element with data-target="${name}" in this component. ` +
          `Add it to the markup, or use targets.get() if its absence is expected.`,
      );
    },
  };
}
