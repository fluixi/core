/**
 * @fluixi/cli — the `fluixi` command-line tool.
 *
 * The binary lives in `cli.ts` (`fluixi <dev|build|start>`). This entry re-exports
 * the underlying runtime so the commands can also be driven programmatically.
 */
export { defineConfig, loadConfig } from '@fluixi/start';
export { dev, build, start } from '@fluixi/start/commands';
export type { FluixiConfig } from '@fluixi/start';
