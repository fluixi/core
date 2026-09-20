// What a bare specifier resolves to in the playground.
//
// These are the real packages, already in the bundle, importing '@fluixi/core' here gets the
// same module an application would, not a stub. Nothing is shadowed: the graph comes from the
// runtime reporting its own nodes, so a project imports the primitives it would ship with.
import * as core from '@fluixi/core';
import * as dom from '@fluixi/dom';
import * as domServer from '@fluixi/dom/server';
import * as jsx from '@fluixi/jsx';
import * as reactive from '@fluixi/reactive';
import * as signal from '@fluixi/reactive/signal';
import * as store from '@fluixi/reactive/store';

type Namespace = Record<string, unknown>;

const BASE: Record<string, Namespace> = {
  '@fluixi/core': core as Namespace,
  '@fluixi/dom': dom as Namespace,
  '@fluixi/dom/runtime': dom as Namespace,
  '@fluixi/dom/reactive': dom as Namespace,
  '@fluixi/dom/server': domServer as Namespace,
  '@fluixi/jsx': jsx as Namespace,
  '@fluixi/jsx/runtime': jsx as Namespace,
  '@fluixi/reactive': reactive as Namespace,
  '@fluixi/reactive/signal': signal as Namespace,
  '@fluixi/reactive/store': store as Namespace,
};

/** The specifiers a project can import, for the editor's completion and the error message. */
export const KNOWN_SPECIFIERS = Object.keys(BASE).sort();

/** What a project's bare specifiers resolve to. A copy, so a run cannot edit the originals. */
export function createRegistry(): Record<string, Namespace> {
  const registry: Record<string, Namespace> = {};
  for (const [specifier, namespace] of Object.entries(BASE)) {
    registry[specifier] = { ...namespace };
  }
  return registry;
}
