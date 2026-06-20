#!/usr/bin/env node
/**
 * `npm create @fluixi <dir>` — scaffold a new Fluixi app. Prompts for a name and a
 * mode (SSR via @fluixi/start, or SPA via vite + @fluixi/vite-plugin), unless given on
 * the command line: `create-fluixi my-app --spa` / `--ssr`. Zero runtime deps.
 */
import { cpSync, renameSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output, argv, exit } from 'node:process';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

async function main(): Promise<void> {
  const args = argv.slice(2);
  let dir = args.find((a) => !a.startsWith('-'));
  let mode: 'ssr' | 'spa' | undefined =
    args.includes('--spa') ? 'spa' : args.includes('--ssr') ? 'ssr' : undefined;

  const interactive = input.isTTY && (!dir || !mode);
  if (interactive) {
    const rl = createInterface({ input, output });
    if (!dir) dir = (await rl.question('Project name: (fluixi-app) ')).trim() || 'fluixi-app';
    if (!mode) {
      const a = (await rl.question('Mode — (s)sr or s(p)a? (ssr) ')).trim().toLowerCase();
      mode = a.startsWith('p') ? 'spa' : 'ssr';
    }
    rl.close();
  }
  dir = dir ?? 'fluixi-app';
  mode = mode ?? 'ssr';

  const target = resolve(dir);
  const name = basename(target);
  if (existsSync(target)) {
    console.error(`\n✗ "${name}" already exists — pick another name or remove it.\n`);
    exit(1);
  }

  cpSync(here(mode === 'spa' ? '../template-spa' : '../template-ssr'), target, { recursive: true });

  // npm strips a real .gitignore from published packages → restore it from _gitignore.
  const gi = join(target, '_gitignore');
  if (existsSync(gi)) renameSync(gi, join(target, '.gitignore'));

  const pkgPath = join(target, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.name = name;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  console.log(`\n✓ Created ${name} (${mode.toUpperCase()})\n`);
  console.log('Next steps:');
  console.log(`  cd ${dir}`);
  console.log('  pnpm install   # or npm install / yarn');
  console.log('  pnpm dev\n');
}

main();
