// Which components provide a context, and which read it.
//
// The graph cannot show this on its own. A provider stamps a value on the owner chain and a
// reader walks up looking for it, so neither is a dependency and no edge is ever made. The
// two components end up as unrelated cards even though one feeds the other.
import { registerDevtoolsPlugin, type DevtoolsPlugin } from '../plugin.js';
import { shorten } from '../format.js';
import type { RNode } from '../instrument.js';

export const NAME = 'context';

/** What lands on a component under this plugin's name. */
export interface ContextNote {
  name: string;
  kind: 'provide' | 'read';
  value?: string;
}

export const contextPlugin: DevtoolsPlugin = {
  name: NAME,

  collect(ctx) {
    /** One node per context, however many components touch it. */
    const nodes = new Map<symbol, number>();

    ctx.onContext((report) => {
      if (report.owner === undefined) return;

      let node = nodes.get(report.id);
      if (node === undefined) {
        // `createContext` names its symbol `context` unless told otherwise, so an unnamed
        // one is said by where it came from rather than drawn seven times identically.
        const label =
          report.name === 'context' && report.ownerLabel
            ? `${report.ownerLabel} context`
            : report.name;
        node = ctx.add({
          label,
          kind: 'context',
          // A context is created at module scope with nothing running, so the only line it
          // can carry is the one that provided or read it.
          ...(report.at ? { source: report.at } : {}),
          // The router's own contexts are the framework's, and belong in its card rather
          // than beside the ones the application wrote.
          authored: report.at?.external !== true,
          // Under whoever provided it. A context read with no provider above it belongs to
          // the reader, which is the honest place for a default value.
          createdIn: report.owner,
          // Short on the card, whole in the inspector, the way every other node works.
          ...(report.value !== undefined
            ? { value: shorten(report.value), detail: report.value }
            : {}),
        });
        nodes.set(report.id, node);
      }

      // A component that provides is a provider. Only this plugin can tell, and a card
      // reading `component` says nothing about why it is there.
      if (report.kind === 'provide') ctx.retype(report.owner, 'provider');

      const held = (ctx.annotation(report.owner) as ContextNote[] | undefined) ?? [];
      const already = held.some((n) => n.name === report.name && n.kind === report.kind);
      if (already) return;
      held.push({
        name: report.name,
        kind: report.kind,
        ...(report.value !== undefined ? { value: report.value } : {}),
      });
      ctx.annotate(report.owner, held);
    });
  },

  rows(node: RNode) {
    const notes = node.extra?.[NAME] as ContextNote[] | undefined;
    if (!notes?.length) return [];
    return notes.map((note) => ({
      label: note.kind === 'provide' ? `provides ${note.name}` : `reads ${note.name}`,
      ...(note.value !== undefined ? { value: note.value } : {}),
    }));
  },

  badge(node: RNode) {
    const notes = node.extra?.[NAME] as ContextNote[] | undefined;
    if (!notes?.length) return undefined;
    const given = notes.filter((n) => n.kind === 'provide');
    if (given.length === 1) return `provides ${given[0]!.name}`;
    if (given.length > 1) return `provides ${given.length}`;
    return notes.length === 1 ? `reads ${notes[0]!.name}` : `reads ${notes.length}`;
  },
};

registerDevtoolsPlugin(contextPlugin);
