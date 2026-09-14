// What directives an element was given.
//
// The graph already shows that something writes a class or a style, because the dom reports
// the binding. It does not show which directive asked for it, and `use:` is invisible
// entirely since a custom directive is a function call with no reactive node behind it.
import { registerDevtoolsPlugin, type DevtoolsPlugin, type DirectiveReport } from '../plugin.js';
import type { RNode } from '../instrument.js';

export const NAME = 'directives';

/** What lands on a node under this plugin's name. */
export interface DirectiveNote {
  kind: string;
  name: string;
  element: string;
  at?: { file?: string; line?: number; column?: number };
}

const label = (note: DirectiveNote): string =>
  note.kind === 'ref' ? `ref ${note.name}` : `${note.kind}:${note.name}`;

export const directivesPlugin: DevtoolsPlugin = {
  name: NAME,

  collect(ctx) {
    ctx.onDirective((report: DirectiveReport) => {
      if (report.owner === undefined) return;
      const held = (ctx.annotation(report.owner) as DirectiveNote[] | undefined) ?? [];
      // One entry per directive per element. A render effect re-runs and would otherwise
      // add the same one on every pass.
      const already = held.some(
        (n) => n.kind === report.kind && n.name === report.name && n.element === report.element,
      );
      if (already) return;
      held.push({
        kind: report.kind,
        name: report.name,
        element: report.element,
        ...(report.at ? { at: report.at } : {}),
      });
      ctx.annotate(report.owner, held);
    });
  },

  rows(node: RNode) {
    const notes = node.extra?.[NAME] as DirectiveNote[] | undefined;
    if (!notes?.length) return [];
    return notes.map((note) => ({
      label: label(note),
      value: note.element,
      ...(note.at ? { at: note.at } : {}),
    }));
  },

  badge(node: RNode) {
    const notes = node.extra?.[NAME] as DirectiveNote[] | undefined;
    return notes?.length ? label(notes[0]!) : undefined;
  },
};

registerDevtoolsPlugin(directivesPlugin);
