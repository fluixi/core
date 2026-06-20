#!/usr/bin/env node
/**
 * `npm create @fluixi <dir>` (or `pnpm create @fluixi <dir>`) — scaffold a new Fluixi
 * app from the bundled template (an @fluixi/start app: SSR + file routing + hydration).
 * Zero runtime deps; copies `template/`, renames `_gitignore` → `.gitignore`, and sets
 * the package name.
 */
import { cpSync, renameSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE = fileURLToPath(new URL('../template', import.meta.url));

function main(): void {
  const arg = process.argv[2];
  const target = resolve(arg ?? 'fluixi-app');
  const name = basename(target);

  if (existsSync(target)) {
    console.error(`\n✗ "${name}" already exists — pick another name or remove it.\n`);
    process.exit(1);
  }

  cpSync(TEMPLATE, target, { recursive: true });

  // npm strips a real .gitignore from published packages, so the template ships it as
  // _gitignore — restore the dotfile in the scaffolded app.
  const gi = join(target, '_gitignore');
  if (existsSync(gi)) renameSync(gi, join(target, '.gitignore'));

  const pkgPath = join(target, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.name = name;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  console.log(`\n✓ Created ${name}\n`);
  console.log('Next steps:');
  console.log(`  cd ${arg ?? 'fluixi-app'}`);
  console.log('  pnpm install   # or npm install / yarn');
  console.log('  pnpm dev       # SSR dev server + HMR\n');
}

main();
