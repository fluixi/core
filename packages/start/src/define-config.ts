/**
 * `defineConfig`, alone, away from the loader.
 *
 * It is an identity function that exists for the types, and it belongs to the root
 * export because a config file is the first thing an app writes. Keeping it here rather
 * than in `config.ts` is what lets the root entry stay importable in a browser: that
 * module reads the filesystem to find and load a config, and a single value imported
 * from it drags `node:fs` into the client bundle.
 */
import type { FluixiConfig } from './config.js';

export function defineConfig(config: FluixiConfig): FluixiConfig {
  return config;
}
