// What directives an element was given.
//
// The graph already shows that something writes a class or a style, because the dom reports
// the binding. It does not show which directive asked for it, and `use:` is invisible
// entirely since a custom directive is a function call with no reactive node behind it.
import { registerDevtoolsPlugin, type DevtoolsPlugin, type DirectiveReport } from '../plugin.js';
import type { RNode } from '../instrument.js';

export const NAME = 'directives';

/** The notes on an element of a description, for a panel drawing element rows. */
export function directivesOn(extra?: Record<string, unknown>): DirectiveNote[] {
  return (extra?.[NAME] as DirectiveNote[] | undefined) ?? [];
}

/** A short word for a badge. The whole expression an inline ref was written as is not one. */
export function directiveBadge(notes: DirectiveNote[]): string | undefined {
  if (!notes.length) return undefined;
  const first = notes[0]!;
  const short = first.kind === 'ref' ? 'ref' : label(first);
  return notes.length > 1 ? `${short} +${notes.length - 1}` : short;
}

/** A row per directive, for the inspector. */
export function directiveRows(notes: DirectiveNote[]): { label: string; value?: string; at?: DirectiveNote['at'] }[] {
  return notes.map((note) => ({
    label: label(note),
    value: note.element,
    ...(note.at ? { at: note.at } : {}),
  }));
}

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
      // On the element, which is what the directive was applied to. The component that ran
      // is only where the call happened.
      if (!report.target) return;
      const held = (ctx.elementAnnotation(report.target) as DirectiveNote[] | undefined) ?? [];
      // A render effect re-runs, so the same directive arrives more than once.
      const already = held.some((n) => n.kind === report.kind && n.name === report.name);
      if (already) return;
      held.push({
        kind: report.kind,
        name: report.name,
        element: report.element,
        ...(report.at ? { at: report.at } : {}),
      });
      ctx.annotateElement(report.target, held);
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

  elementRows(extra) {
    return directiveRows(directivesOn(extra));
  },

  elementBadge(extra) {
    return directiveBadge(directivesOn(extra));
  },

  badge(node: RNode) {
    const notes = node.extra?.[NAME] as DirectiveNote[] | undefined;
    if (!notes?.length) return undefined;
    // A badge sits beside a label, so it says which directive and not the whole expression
    // an inline ref was written as.
    const first = notes[0]!;
    const short = first.kind === 'ref' ? 'ref' : label(first);
    return notes.length > 1 ? `${short} +${notes.length - 1}` : short;
  },
};

registerDevtoolsPlugin(directivesPlugin);
