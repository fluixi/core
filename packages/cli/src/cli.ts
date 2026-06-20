#!/usr/bin/env node
import { loadConfig, dev, build, start } from '@fluixi/start';
import { generate } from './generate.js';

const USAGE = `fluixi — the Fluixi command-line tool

Usage: fluixi <command>

Commands:
  dev                       Start the SSR dev server (Vite middleware + HMR)
  build                     Build the client + server bundles for production
  start                     Run the production SSR server (after build)
  generate <kind> <name>    Scaffold a component / route / middleware (alias: g)

New project: npm create @fluixi <dir>
`;

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (!cmd || cmd === '-h' || cmd === '--help') {
    console.log(USAGE);
    process.exit(cmd ? 0 : 1);
  }

  // generate works on the local files and doesn't need the app config.
  if (cmd === 'generate' || cmd === 'g') {
    generate(process.argv[3], process.argv[4]);
    return;
  }

  const config = await loadConfig();

  switch (cmd) {
    case 'dev':
      await dev(config);
      break;
    case 'build':
      await build(config);
      break;
    case 'start':
      await start(config);
      break;
    default:
      console.error(`Unknown command: ${cmd}\n`);
      console.log(USAGE);
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
