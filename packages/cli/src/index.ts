/**
 * @fluixi/cli — the `fluixi` command-line tool.
 *
 * The binary lives in `cli.ts` (`fluixi <dev|build|start>`). This entry re-exports
 * the underlying runtime so the commands can also be driven programmatically.
 */
export { dev, build, start, defineConfig, loadConfig } from '@fluixi/start';
export type { FluixiConfig } from '@fluixi/start';
