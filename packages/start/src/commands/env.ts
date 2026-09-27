/**
 * `fluixi env`: what the app declares against what its env files hold.
 *
 * Names only. A value is read to know whether it is set and never printed, so the output is
 * safe to paste into an issue or a CI log.
 */
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { resolveConfig, type FluixiConfig } from '../config.js';
import { loadServerEnv, writeEnvTypes } from '../internal.js';
import { findExposedSecrets, type ExposedSecret } from '../env-guard.js';
import { suspectPublicNames } from '../env.js';
import { c, symbols } from '../ui.js';

export interface EnvReport {
  /** Each `env.public` name and whether it has a value, bare or with the client prefix. */
  public: { name: string; set: boolean }[];
  /** In `.env.example` and in no local env file: what a fresh checkout is missing. */
  missing: string[];
  /** Set locally and absent from `.env.example`: what the next developer will not know about. */
  undocumented: string[];
  /** `env.public` names that read like secrets. */
  secretPublic: string[];
  /** Client-prefixed secrets, which Vite inlines whether read or not. */
  exposed: ExposedSecret[];
  /** The generated types file, when there was anything to declare. */
  types: string | null;
}

const LOCAL_FILES = ['.env', '.env.local', '.env.development', '.env.development.local'];

function namesIn(root: string, file: string): string[] | null {
  const path = resolve(root, file);
  if (!existsSync(path)) return null;
  const text = readFileSync(path, 'utf8');
  return [...text.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map((m) => m[1]);
}

export async function envReport(config: FluixiConfig, prefix = 'VITE_'): Promise<EnvReport> {
  const cfg = resolveConfig(config);
  const root = cfg.root;
  const declared = cfg.env?.public ?? [];
  await loadServerEnv(root, 'development');

  const example = namesIn(root, '.env.example');
  const local = new Set(LOCAL_FILES.flatMap((f) => namesIn(root, f) ?? []));
  const has = (n: string) => local.has(n) || local.has(prefix + n);

  return {
    public: declared.map((name) => ({ name, set: !!(process.env[name] ?? process.env[prefix + name]) })),
    missing: example ? example.filter((n) => !has(n) && !process.env[n]) : [],
    undocumented: example
      ? [...local].filter((n) => !example.includes(n) && !(n.startsWith(prefix) && example.includes(n.slice(prefix.length))))
      : [],
    secretPublic: suspectPublicNames(declared),
    exposed: findExposedSecrets(root, prefix),
    types: writeEnvTypes(root, declared),
  };
}

/** Print the report. Returns the exit code: 1 when something would ship a secret. */
export async function env(config: FluixiConfig): Promise<number> {
  const cfg = resolveConfig(config);
  const r = await envReport(config);
  const out: string[] = [''];
  const head = (s: string) => out.push(`  ${c.bold(s)}`);
  const line = (mark: string, s: string) => out.push(`    ${mark} ${s}`);

  head('env.public');
  if (!r.public.length) line(c.gray('-'), c.gray('none declared: browser code reads no variables'));
  for (const p of r.public) line(p.set ? symbols.ok : c.yellow('!'), p.set ? p.name : `${p.name} ${c.gray('not set')}`);

  if (r.missing.length || r.undocumented.length) {
    out.push('');
    head('.env.example');
    for (const n of r.missing) line(c.yellow('!'), `${n} ${c.gray('is in .env.example and not set locally')}`);
    for (const n of r.undocumented) line(c.gray('-'), `${n} ${c.gray('is set locally and missing from .env.example')}`);
  }

  const secrets = r.secretPublic.length + r.exposed.length;
  if (secrets) {
    out.push('');
    head('Secrets that would reach the browser');
    for (const n of r.secretPublic) line(symbols.err, `${n} ${c.gray('is in env.public')}`);
    for (const e of r.exposed) line(symbols.err, `${e.name} ${c.gray(`in ${e.file} carries the client prefix`)}`);
  }

  if (r.types) {
    out.push('');
    line(symbols.ok, c.gray(`types written to ${relative(cfg.root, r.types)}`));
  }
  out.push('');
  console.log(out.join('\n'));
  return secrets ? 1 : 0;
}
