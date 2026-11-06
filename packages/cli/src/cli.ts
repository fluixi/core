#!/usr/bin/env node
import { loadConfig } from '@fluixi/start/config';
import { dev, build, start, worker, env, envReport, info } from '@fluixi/start/commands';
import { wordmark, c } from '@fluixi/start/ui';
import { generate } from './generate.js';
import { add } from './add.js';
import { startMismatch } from './start-copy.js';
import { check } from './check.js';
import { diagnose, resolvedVersions } from './doctor.js';
import { portOverride } from './port.js';

function usage(): string {
  const cmd = (name: string, desc: string) =>
    `  ${c.cyan(name.padEnd(25))}${c.gray(desc)}`;
  return [
    '',
    `  ${wordmark()}  ${c.gray('the Fluixi command-line tool')}`,
    '',
    `  ${c.bold('Usage')}  ${c.gray('fluixi <command>')}`,
    '',
    cmd('dev [--port=<n>]', 'start the SSR dev server (Vite middleware + HMR)'),
    cmd('build', 'build the client + server bundles for production'),
    cmd('build --format=web-component', 'build custom elements as portable files'),
    cmd('start [--port=<n>]', 'run the production SSR server (after build); PORT also sets it'),
    cmd('worker [--port=<n>]', 'run the background jobs (after build); the port answers /health'),
    cmd('generate <kind> <name>', 'scaffold code, see fluixi g --help  ' + c.dim('(alias: g)')),
    cmd('add auth', 'set up authentication: asks, writes, installs'),
    cmd('check [--strict]', 'env and auth rules over the project, for CI'),
    cmd('env', 'declared and set variables, secrets that would ship, env types'),
    cmd('doctor', 'duplicate packages, editor plugin, env problems'),
    cmd('info', 'versions, adapter, modules, page and API routes'),
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

  // add works on the local files, like generate.
  if (cmd === 'add') {
    await add(process.argv[3], process.argv.slice(3));
    return;
  }

  // check reads tsconfig and the sources, never the app config.
  if (cmd === 'check') {
    process.exitCode = check(process.cwd(), process.argv.includes('--strict'));
    return;
  }

  const config = await loadConfig();

  const mismatch = startMismatch(process.cwd(), import.meta.url);
  if (mismatch) {
    const { app, cli } = mismatch;
    console.warn(
      `\n  ${c.yellow('!')} fluixi is running @fluixi/start ${cli.version} from ${cli.dir}\n` +
        `    but this app resolves ${app.version} from ${app.dir}.\n` +
        `    Changes to the app's copy will not take effect. With npm, add\n` +
        `    "overrides": { "@fluixi/start": "$@fluixi/start" } to package.json and reinstall.\n`,
    );
  }

  switch (cmd) {
    case 'dev':
      await dev(withPort(config));
      break;
    case 'build': {
      // `--format=web-component` for a portable file, `--format=fluixi` for one that
      // shares the app's runtime. Anything else builds the app.
      const flag = process.argv.find((a) => a.startsWith('--format='));
      const format = flag?.slice('--format='.length) as
        | 'app'
        | 'web-component'
        | 'fluixi'
        | undefined;
      await build(config, format ? { format } : {});
      break;
    }
    case 'start':
      await start(withPort(config));
      break;
    case 'worker': {
      // Only an explicit port: PORT belongs to the web server on most platforms.
      const port = portOverride(process.argv.slice(3), {});
      await worker(config, port === undefined ? {} : { port });
      break;
    }
    case 'env':
      process.exitCode = await env(config);
      break;
    case 'info':
      await info(config, resolvedVersions(config.root ?? process.cwd()));
      break;
    case 'doctor':
      process.exitCode = await doctor(config);
      break;
    default:
      console.error(`\n  ${c.red('✗')} Unknown command: ${c.bold(cmd)}`);
      console.log(usage());
      process.exit(1);
  }
}

/** The config with the port `--port` or `PORT` chose, if any; a bad value stops here. */
function withPort(config: Awaited<ReturnType<typeof loadConfig>>): Awaited<ReturnType<typeof loadConfig>> {
  try {
    const port = portOverride(process.argv.slice(3), process.env);
    return port === undefined ? config : { ...config, port };
  } catch (error) {
    console.error(`\n  ${c.red('✗')} ${(error as Error).message}`);
    process.exit(1);
  }
}

async function doctor(config: Awaited<ReturnType<typeof loadConfig>>): Promise<number> {
  const problems = diagnose(config.root ?? process.cwd());
  const r = await envReport(config);
  for (const n of r.secretPublic) problems.push({ severity: 'error', message: `${n} is in env.public and reads like a secret` });
  for (const e of r.exposed) problems.push({ severity: 'error', message: `${e.name} in ${e.file} carries the client prefix, so Vite ships it` });
  for (const p of r.public.filter((p) => !p.set)) problems.push({ severity: 'warning', message: `${p.name} is in env.public and not set` });
  for (const n of r.missing) problems.push({ severity: 'warning', message: `${n} is in .env.example and not set locally` });

  const lines = problems.map((p) => `  ${p.severity === 'error' ? c.red('✗') : c.yellow('!')} ${p.message}`);
  console.log(['', ...(lines.length ? lines : [`  ${c.green('✓')} nothing to report`]), ''].join('\n'));
  return problems.some((p) => p.severity === 'error') ? 1 : 0;
}

main().catch((e) => {
  console.error(`\n  ${c.red('✗')} ${e?.message ?? e}\n`);
  process.exit(1);
});
