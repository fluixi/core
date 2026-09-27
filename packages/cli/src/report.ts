/** How the CLI shows what a scaffold step did. */
import { relative } from 'node:path';
import { c } from '@fluixi/start/ui';
import type { AuthResult, Step } from './scaffold/index.js';

const rel = (file: string) => relative(process.cwd(), file) || '.';

export function report(steps: Step[]): void {
  for (const s of steps) {
    if (s.kind === 'hint') {
      console.log(`  ${c.yellow('!')} ${c.gray('add to')} ${c.cyan(rel(s.file))}${c.gray(':')}`);
      for (const l of s.lines) console.log(`    ${l}`);
    } else if (s.kind === 'kept') {
      console.log(`  ${c.gray('-')} ${c.cyan(rel(s.file))} ${c.gray('exists, kept')}`);
    } else if (s.kind === 'listed') {
      console.log(`  ${c.gray('-')} ${c.cyan(rel(s.file))} ${c.gray('already lists it')}`);
    } else {
      console.log(`  ${c.green('✓')} ${c.gray(s.kind)} ${c.cyan(rel(s.file))}${s.detail ? c.gray(`: ${s.detail}`) : ''}`);
    }
  }
}

/** Steps, then notes and what is left, for an auth setup. */
export function reportAuth(result: AuthResult, installHint?: string): void {
  for (const n of result.notes) console.log(`  ${c.gray(n)}`);
  report(result.steps);
  const next = [...(installHint ? [installHint] : []), ...result.next];
  if (next.length) console.log(`  ${c.gray('next:')} ${next.map((n) => c.gray(n)).join(c.gray('; '))}`);
}
