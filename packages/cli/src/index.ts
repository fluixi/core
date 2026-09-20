/**
 * @fluixi/cli: the `fluixi` command-line tool.
 *
 * The binary lives in `cli.ts` (`fluixi <dev|build|start>`). This entry re-exports
 * the underlying runtime so the commands can also be driven programmatically.
 */
export { defineConfig } from '@fluixi/start';
// The loader reads a file, so it is behind the config subpath rather than the root
// entry, which stays importable from a browser bundle.
export { loadConfig } from '@fluixi/start/config';
export { dev, build, start } from '@fluixi/start/commands';
export type { FluixiConfig } from '@fluixi/start';
