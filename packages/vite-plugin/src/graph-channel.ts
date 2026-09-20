// The running app's reactive graph, offered to whatever wants to draw it.
//
// A dev-only agent module goes into the page ahead of the entry, so no node is created
// before something is watching. It pushes the graph over the channel Vite already keeps open
// for HMR, and the dev server holds the latest state and answers a plain GET — so an editor
// extension, a panel, or curl all read the same thing without speaking HMR.
//
//   GET /__fluixi/graph  →  { t, nodes: [...] }
//
// Off in a build. The agent's own half comes from this package's dependency rather than from
// the application, so a project gets the graph by having the plugin and nothing else; only
// the framework itself is resolved from the project, because watching a second copy of the
// runtime would watch a graph nobody is using.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const VIRTUAL = 'virtual:fluixi/devtools-agent';
const RESOLVED = `\0${VIRTUAL}`;
const ENDPOINT = '/__fluixi/graph';
const EVENT = 'fluixi:graph';
/** Why a project that runs the plugin might still have nothing to show. */
const MISSING = 'the plugin could not load @fluixi/devtools from its own dependencies';
const WAITING = 'no page has reported yet — open the application in a browser';

/** How often the agent looks for movement. Fast enough to watch, slow enough to ignore. */
const INTERVAL = 100;

/** A few hundred interactions' worth. */
const HISTORY = 500;

/** Written with the ids resolved: a virtual module has no directory to resolve a bare one from. */
const agentSource = (devtools: string, plugins: string, signal: string, reactive: string) => `
import { installDevtoolsHook, observeGraph } from ${JSON.stringify(devtools)};
import ${JSON.stringify(plugins)};
import { observeReactiveNodes } from ${JSON.stringify(signal)};
import { VERSION } from ${JSON.stringify(reactive)};

// The runtime this module imports is the application's own — same module graph, same nodes.
// Nothing waits for the runtime to offer itself; that path is for a tool loaded from outside.
//
// \`watch\` is this copy of devtools, handed over with the runtime. A browser extension
// installs a hook at document_start and so owns it; without this the graph would be built
// by that extension's build rather than the one shipped alongside this application.
const hook = installDevtoolsHook();
hook.inject({ observeReactiveNodes, version: VERSION, watch: observeGraph });

const send = (kind, snapshot) => import.meta.hot?.send(${JSON.stringify(EVENT)}, { kind, snapshot });

const first = hook.snapshot();
// Kept and handed back, so a browser panel polling the same hook cannot consume what this
// one has not been told about yet.
let cursor = first?.cursor;
send('full', first);
const timer = setInterval(() => {
  const delta = hook.snapshot({ partial: true, since: cursor });
  if (!delta) return;
  cursor = delta.cursor;
  // Events count on their own: an effect that ran without changing a value moves no node.
  if (delta.nodes.length || delta.removed?.length || delta.events?.length) send('delta', delta);
}, ${INTERVAL});

import.meta.hot?.dispose(() => clearInterval(timer));
`;

type WireModule = typeof import('@fluixi/devtools/wire');

/**
 * The devtools bundle this plugin depends on, as a path the dev server can serve.
 *
 * Asking the application to install it as well made the graph depend on a devDependency
 * nobody knew to add, and in a workspace it resolved for one project and not the one beside
 * it — which reads as the feature being broken rather than absent.
 */
function ownDevtools(): string | null {
  return resolveForBrowser('@fluixi/devtools');
}

/** The built-in plugins, beside the bundle they extend. Collecting happens in the agent. */
function ownPlugins(): string | null {
  return resolveForBrowser('@fluixi/devtools/plugins');
}

/**
 * A package's ESM entry, by path.
 *
 * The agent below is served to a browser as an ES module and imports these by `/@fs/`
 * path, so the file has to be the one with the named exports. `createRequire().resolve`
 * answers with the `require` condition instead — the CJS build — and a `.cjs` file
 * offers nothing to import, which surfaces as "does not provide an export named
 * 'installDevtoolsHook'". It only started happening when devtools gained a CJS build;
 * before that there was one file and either resolver found it.
 */
function resolveForBrowser(spec: string): string | null {
  // Honours the `import` condition, which is the one that matches how this is loaded.
  try {
    const resolved = (import.meta as { resolve?: (s: string) => string }).resolve?.(spec);
    if (resolved) return fileURLToPath(resolved);
  } catch {
    // Fall through to the require-based resolution below.
  }

  try {
    const required = createRequire(import.meta.url).resolve(spec);
    if (!required.endsWith('.cjs')) return required;
    // Landed on the CJS build. Prefer its ESM sibling when the package ships one.
    for (const ext of ['.mjs', '.js']) {
      const sibling = required.slice(0, -'.cjs'.length) + ext;
      if (existsSync(sibling)) return sibling;
    }
    return required;
  } catch {
    return null;
  }
}

/**
 * Add the graph channel to a plugin, keeping whatever hooks it already has. Composed rather
 * than returned alongside so `fluixi()` stays one plugin.
 */
export function withGraphChannel(base: Plugin, enabled: () => boolean, start: () => void): Plugin {
  let wire: WireModule | null = null;
  let available = false;
  /** What to say when the graph is empty. Cleared once a page has reported. */
  let reason: string | null = MISSING;
  let root = process.cwd();
  let log: ((message: string) => void) | undefined;
  let graph = new Map<number, import('@fluixi/devtools').RNode>();
  let stamp = 0;
  /**
   * Kept, not drained: this endpoint has no single reader, and an editor panel draining it
   * would blank a browser panel's timeline. Every event carries a seq, so consumers dedupe.
   */
  let events: import('@fluixi/devtools').GraphEvent[] = [];

  const baseResolveId = base.resolveId as
    | ((this: unknown, id: string, importer?: string) => unknown)
    | undefined;
  const baseTransformIndexHtml = base.transformIndexHtml as unknown;

  return {
    ...base,

    resolveId(this: unknown, id: string, importer?: string) {
      if (id === VIRTUAL) return RESOLVED;
      return baseResolveId?.call(this, id, importer) ?? null;
    },

    async load(this: ResolveContext, id: string) {
      if (id !== RESOLVED) return null;
      const from = join(root, 'fluixi-devtools-agent.js');
      // Only the framework comes from the application: the hook hands over that runtime's
      // own registration, and a second copy would report a graph nothing is using.
      const specs = ['@fluixi/reactive/signal', '@fluixi/reactive'];
      const ids = await Promise.all(specs.map((spec) => this.resolve?.(spec, from, { skipSelf: true })));
      const missing = specs.filter((_, i) => !ids[i]?.id);
      const devtools = ownDevtools();
      const plugins = ownPlugins();
      // Nothing to watch with is not an error worth breaking the page over.
      if (missing.length || !devtools || !plugins) {
        reason = missing.length
          ? `${missing.join(', ')} did not resolve from ${root}`
          : MISSING;
        log?.(`[fluixi] reactive graph off — ${reason}`);
        return 'export {};';
      }
      // Served by path: it is this package's copy, not one the application imports.
      return agentSource(`/@fs/${devtools}`, `/@fs/${plugins}`, ids[0]!.id, ids[1]!.id);
    },

    async configureServer(server: {
      ws: { on(event: string, cb: (payload: unknown) => void): void };
      middlewares: { use(path: string, handler: (req: unknown, res: ServerResponse) => void): void };
      config?: { root?: string; logger?: { info(message: string): void } };
    }) {
      if (!enabled()) return;
      root = server.config?.root ?? root;
      log = server.config?.logger?.info.bind(server.config.logger);
      wire = await import('@fluixi/devtools/wire').catch(() => null);
      available = wire !== null;
      // Source marks cost something, so they wait until there is a server watching for them.
      if (wire) start();
      if (wire) reason = WAITING;
      else {
        // Said once, not per request: without the package there is no agent to inject and
        // nothing to report, and that is a missing devDependency rather than a failure.
        log?.(`[fluixi] reactive graph off — ${MISSING}`);
      }

      // The endpoint answers either way. A tool asking for the graph of a project that has
      // not turned it on deserves to be told which of the two it is, and 404 says neither —
      // it reads the same as a dev server that is not a fluixi project at all.
      server.middlewares.use(ENDPOINT, (_req, res) => {
        const snapshot = wire
          ? { ...wire.serializeGraph(graph, stamp || Date.now()), events }
          : { t: Date.now(), nodes: [] };
        const body = JSON.stringify(reason ? { ...snapshot, reason } : snapshot);
        res.setHeader('Content-Type', 'application/json');
        // Read by an editor extension and by panels served from another origin.
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-store');
        res.end(body);
      });

      if (!wire) return;

      server.ws.on(EVENT, (payload) => {
        const message = payload as { kind?: string; snapshot?: Parameters<WireModule['applySnapshot']>[1] };
        if (!message?.snapshot || !wire) return;
        // A reload sends a full snapshot, which replaces whatever the last page left behind.
        const full = message.kind === 'full';
        graph = wire.applySnapshot(full ? new Map() : graph, message.snapshot);
        // The history goes with it: its ids name nodes the previous page had.
        if (full) events = [];
        const arriving = (message.snapshot as { events?: typeof events }).events;
        if (arriving?.length) events = [...events, ...arriving].slice(-HISTORY);
        stamp = Date.now();
        reason = null;
      });

    },

    transformIndexHtml: {
      order: 'pre' as const,
      handler(html: string, ctx: unknown) {
        const inherited = callInheritedHtml(baseTransformIndexHtml, html, ctx);
        if (!enabled() || !available || !wire) return inherited;
        return {
          html: typeof inherited === 'string' ? inherited : html,
          tags: [
            {
              tag: 'script',
              // First in the head, so the entry cannot create a node before the agent runs.
              injectTo: 'head-prepend' as const,
              attrs: { type: 'module', src: `/@id/${VIRTUAL}` },
            },
          ],
        };
      },
    },
  } as Plugin;
}

interface ResolveContext {
  resolve?(
    source: string,
    importer?: string,
    options?: { skipSelf?: boolean },
  ): Promise<{ id: string } | null>;
}

interface ServerResponse {
  setHeader(name: string, value: string): void;
  end(body: string): void;
}

/** A plugin may declare transformIndexHtml as a function or as an object with a handler. */
function callInheritedHtml(hook: unknown, html: string, ctx: unknown): string | undefined {
  if (typeof hook === 'function') return (hook as (h: string, c: unknown) => string | undefined)(html, ctx);
  const handler = (hook as { handler?: (h: string, c: unknown) => string | undefined } | undefined)?.handler;
  return handler?.(html, ctx);
}
