#!/usr/bin/env node
import { loadConfig, dev, build, start } from '@fluixi/start';

const USAGE = `fluixi — the Fluixi command-line tool

Usage: fluixi <command>

Commands:
  dev      Start the SSR dev server (Vite middleware + HMR)
  build    Build the client + server bundles for production
  start    Run the production SSR server (after build)

(scaffolding + generators land in later releases)
`;

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (!cmd || cmd === '-h' || cmd === '--help') {
    console.log(USAGE);
    process.exit(cmd ? 0 : 1);
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
