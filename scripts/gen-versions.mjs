// Regenerate `src/version.generated.ts` in every package that has one, from its package.json.
//
// Runs after `changeset version` (the root `version` script), so the Version PR carries the
// new constants. Without it, a package's build rewrote the file after every release and the
// committed constant lagged behind its package.json.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const packages = join(import.meta.dirname, '..', 'packages');
for (const name of readdirSync(packages)) {
  const dir = join(packages, name);
  if (!existsSync(join(dir, 'src', 'version.generated.ts'))) continue;
  execFileSync('node', [join(import.meta.dirname, 'gen-version.mjs'), dir], { stdio: 'inherit' });
}
