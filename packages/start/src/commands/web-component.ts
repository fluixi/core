/**
 * Build a component as a custom element someone else can use.
 *
 * Two shapes, because there are two situations and they want opposite things.
 *
 * `standalone` is the one the feature exists for: a single file a page loads with a
 * `<script type="module">` and nothing else. The Fluixi runtime it needs is inside it, so
 * the consumer installs nothing. That is also why it is not the default for an app: five
 * components built this way carry five copies of the runtime.
 *
 * `shared` is for an app that already has Fluixi. The runtime stays an import, so the
 * bundler that assembles the app gives every component the same copy.
 *
 * Registration is the component's own `defineElement(...)` call at module scope. Nothing
 * is generated for it: importing the file is what defines the element, which is what a
 * `<script src>` does.
 */
import { resolve, basename, extname } from 'node:path';
import { resolveConfig } from '../config.js';
import { fluixiPlugins, singleFileOutput } from '../internal.js';
import type { FluixiConfig } from '../config.js';

/** Which runtime a built element carries. */
export type WebComponentMode = 'standalone' | 'shared';

export interface WebComponentOptions {
  /** The modules to build, each one defining an element. */
  entries: string | string[];
  /** Where the files land. Default: `dist/elements`. */
  outDir?: string;
  /** Default: `standalone`, the portable artifact. */
  mode?: WebComponentMode;
  /** Default: true. */
  minify?: boolean;
}

/**
 * What a shared build leaves as an import.
 *
 * The runtime packages only. A component's own dependencies are bundled either way,
 * because the consumer of an element is a page, not a package manager, and it has no
 * way to install them.
 */
const RUNTIME = [
  '@fluixi/reactive',
  '@fluixi/reactive/signal',
  '@fluixi/reactive/store',
  '@fluixi/dom',
  '@fluixi/core',
  '@fluixi/web-components',
];

/** `src/elements/counter.ts` -> `counter`. */
const elementName = (entry: string): string => basename(entry, extname(entry));

export async function buildWebComponents(
  options: WebComponentOptions,
  config: FluixiConfig = {},
): Promise<string[]> {
  const cfg = resolveConfig(config);
  const { build: viteBuild } = await import('vite');
  const plugins = await fluixiPlugins(cfg);

  const entries = Array.isArray(options.entries) ? options.entries : [options.entries];
  const mode = options.mode ?? 'standalone';
  const outDir = options.outDir ?? 'dist/elements';
  const written: string[] = [];

  for (const entry of entries) {
    const name = elementName(entry);
    await viteBuild({
      root: cfg.root,
      plugins,
      logLevel: 'warn',
      build: {
        outDir,
        // Per entry rather than one call with every entry: a shared chunk between two
        // elements would be a second file, and the point of the artifact is that there
        // is one.
        emptyOutDir: false,
        minify: options.minify ?? true,
        lib: {
          entry: resolve(cfg.root, entry),
          formats: ['es'],
          fileName: () => `${name}.js`,
        },
        rollupOptions: {
          // Standalone externalizes nothing, which is what makes the file self-contained.
          external: mode === 'shared' ? RUNTIME : [],
          // Vite's lib mode warns about this; an element has no exports worth keeping,
          // its effect is the registration.
          output: await singleFileOutput(),
        },
      },
    });
    written.push(`${outDir}/${name}.js`);
  }

  return written;
}
