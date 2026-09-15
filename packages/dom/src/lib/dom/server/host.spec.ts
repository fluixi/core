// @vitest-environment jsdom
//
// The mode and the node factory have to be realm state, not module state.
//
// Each dist entry is bundled separately, so `index.mjs` and `lib/dom/server-renderer.mjs`
// each carry a copy of host.ts. A bundler that pulls in both gets two. When the flag was a
// module variable, renderToString flipped one copy and createNativeElement read the other,
// so a server render built real DOM and the string serializer walked a NamedNodeMap where
// it expected a Map. A dev server hides it by resolving both specifiers to one file.
import { describe, it, expect, afterEach } from 'vitest';
import { isServer, setServerMode, registerServerNodes, getServerNodes } from './host.js';

const KEY = Symbol.for('fluixi.dom.server-host');
const realm = globalThis as unknown as Record<PropertyKey, { server: boolean; nodes: unknown }>;

afterEach(() => setServerMode(false));

describe('the server host', () => {
  it('keeps the mode on the realm, where a second copy of this file would find it', () => {
    setServerMode(true);
    expect(realm[KEY].server).toBe(true);
    expect(isServer()).toBe(true);
  });

  it('reads a mode another copy set', () => {
    // What the other copy's setServerMode does, reaching the same object.
    realm[KEY].server = true;
    expect(isServer()).toBe(true);
  });

  it('finds a factory another copy registered', () => {
    const factory = { createElement: () => ({}) } as never;
    registerServerNodes(factory);
    expect(realm[KEY].nodes).toBe(factory);
    expect(getServerNodes()).toBe(factory);
  });
});
