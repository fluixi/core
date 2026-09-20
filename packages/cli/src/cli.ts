#!/usr/bin/env node
import { loadConfig } from '@fluixi/start/config';
import { dev, build, start } from '@fluixi/start/commands';
import { wordmark, c } from '@fluixi/start/ui';
import { generate } from './generate.js';

function usage(): string {
  const cmd = (name: string, desc: string) =>
    `  ${c.cyan(name.padEnd(25))}${c.gray(desc)}`;
  return [
    '',
    `  ${wordmark()}  ${c.gray('the Fluixi command-line tool')}`,
    '',
    `  ${c.bold('Usage')}  ${c.gray('fluixi <command>')}`,
    '',
    cmd('dev', 'start the SSR dev server (Vite middleware + HMR)'),
    cmd('build', 'build the client + server bundles for production'),
    cmd('start', 'run the production SSR server (after build)'),
    cmd('generate <kind> <name>', 'scaffold a component / route / middleware / auth  ' + c.dim('(alias: g)')),
    '',
    `  ${c.gray('New project:')}  ${c.cyan('npm create fluixi')} ${c.gray('<dir>')}`,
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (!cmd || cmd === '-h' || cmd === '--help') {
    console.log(usage());
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
      console.error(`\n  ${c.red('✗')} Unknown command: ${c.bold(cmd)}`);
      console.log(usage());
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(`\n  ${c.red('✗')} ${e?.message ?? e}\n`);
  process.exit(1);
});
