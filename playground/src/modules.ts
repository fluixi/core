// What a bare specifier resolves to in the playground.
//
// These are the real packages, already in the bundle — importing '@fluixi/core' here gets the
// same module an application would, not a stub. The reactive primitives are the exception: the
// graph can only see a signal it created, so those come from the running reactor and shadow the
// package's own. Everything else passes through untouched.
import * as core from '@fluixi/core';
import * as dom from '@fluixi/dom';
import * as jsx from '@fluixi/jsx';
import * as reactive from '@fluixi/reactive';
import * as signal from '@fluixi/reactive/signal';
import * as store from '@fluixi/reactive/store';
import type { Reactor } from '@fluixi/devtools';

type Namespace = Record<string, unknown>;

const BASE: Record<string, Namespace> = {
  '@fluixi/core': core as Namespace,
  '@fluixi/dom': dom as Namespace,
  '@fluixi/dom/runtime': dom as Namespace,
  '@fluixi/dom/reactive': dom as Namespace,
  '@fluixi/jsx': jsx as Namespace,
  '@fluixi/jsx/runtime': jsx as Namespace,
  '@fluixi/reactive': reactive as Namespace,
  '@fluixi/reactive/signal': signal as Namespace,
  '@fluixi/reactive/store': store as Namespace,
};

/** The specifiers a project can import, for the editor's completion and the error message. */
export const KNOWN_SPECIFIERS = Object.keys(BASE).sort();

export type Instrumented = Parameters<Reactor['run']>[0] extends (api: infer A) => unknown ? A : never;

/**
 * The registry for one run. The instrumented primitives replace their package originals so a
 * signal a project creates shows up in the graph, whichever module it imported them from —
 * the long names and the short ones alike, since the reactor supplies both.
 */
export function createRegistry(api: Record<string, unknown>): Record<string, Namespace> {
  const registry: Record<string, Namespace> = {};
  for (const [specifier, namespace] of Object.entries(BASE)) {
    const merged: Namespace = { ...namespace };
    for (const [name, value] of Object.entries(api)) {
      if (name in merged) merged[name] = value;
    }
    registry[specifier] = merged;
  }
  return registry;
}
