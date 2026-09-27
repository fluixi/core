/**
 * The few edits a generator makes to files the app already has.
 *
 * Text insertions at known shapes, never a parse and reprint: `app.config.ts` and
 * `fluixi.config.ts` are the author's code, and reprinting them loses their formatting. When a
 * file does not have the shape looked for, the line to add is printed instead.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { c } from '@fluixi/start/ui';

const rel = (file: string) => relative(process.cwd(), file);
const said = (verb: string, file: string, what?: string) =>
  console.log(`  ${c.green('✓')} ${c.gray(verb)} ${c.cyan(rel(file))}${what ? c.gray(`: ${what}`) : ''}`);
const hint = (file: string, lines: string[]) => {
  console.log(`  ${c.yellow('!')} ${c.gray('add to')} ${c.cyan(rel(file))}${c.gray(':')}`);
  for (const l of lines) console.log(`    ${l}`);
};

/** Index just past the bracket matching the one at `open`, skipping strings and comments. */
function closing(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '/') i = text.indexOf('\n', i) === -1 ? text.length : text.indexOf('\n', i);
    else if (ch === '/' && text[i + 1] === '*') i = text.indexOf('*/', i + 2) + 1;
    else if (ch === "'" || ch === '"' || ch === '`') {
      for (i++; i < text.length && text[i] !== ch; i++) if (text[i] === '\\') i++;
    } else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch) && --depth === 0) return i;
  }
  return -1;
}

/**
 * Add items to the array literal at `open`, in its layout: one per line when it is written
 * that way, inline otherwise.
 */
function appendToArray(text: string, open: number, items: string[]): string {
  const close = closing(text, open);
  const inner = text.slice(open + 1, close);
  if (!inner.trim()) return text.slice(0, open + 1) + items.join(', ') + text.slice(close);
  if (inner.includes('\n')) {
    const last = inner.trimEnd();
    const indent = last.slice(last.lastIndexOf('\n') + 1).match(/^\s*/)![0];
    const comma = last.endsWith(',') ? '' : ',';
    const tail = inner.slice(last.length);
    return text.slice(0, open + 1) + last + comma + items.map((i) => `\n${indent}${i},`).join('') + tail + text.slice(close);
  }
  const body = inner.replace(/,?\s*$/, '');
  const trailing = inner.slice(body.length).replace(/^,/, '');
  return text.slice(0, open + 1) + body + ', ' + items.join(', ') + trailing + text.slice(close);
}

/** After the last import statement, or at the top. */
export function addImport(text: string, line: string): string {
  if (text.includes(line)) return text;
  const imports = [...text.matchAll(/^import[\s\S]*?from\s+['"][^'"]+['"];?[^\n]*\n/gm)];
  const at = imports.length ? imports[imports.length - 1].index! + imports[imports.length - 1][0].length : 0;
  return text.slice(0, at) + line + '\n' + text.slice(at);
}

export interface Registration {
  /** The import line, written as it should appear. */
  importLine: string;
  /** What goes in `imports: [...]`. */
  entry: string;
  /** Extra imports the entry needs, such as the config a condition reads. */
  extraImports?: string[];
}

/**
 * List a module in `src/app.config.ts` or `app.config.server.ts`, creating the file when the
 * app has none. Returns false when it printed a hint instead of editing.
 */
export function register(file: string, header: string, r: Registration): boolean {
  const imports = [...(r.extraImports ?? []), r.importLine];
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
      file,
      `${header}import { defineApp } from '@fluixi/start/app';\n${imports.join('\n')}\n\nexport default defineApp({ imports: [${r.entry}] });\n`,
    );
    said('created', file);
    return true;
  }
  let text = readFileSync(file, 'utf8');
  if (text.includes(r.importLine)) {
    console.log(`  ${c.gray('-')} ${c.cyan(rel(file))} ${c.gray('already lists it')}`);
    return true;
  }
  const m = text.match(/\bimports\s*:\s*\[/);
  if (!m) {
    hint(file, [...imports, `imports: [${r.entry}]`]);
    return false;
  }
  text = appendToArray(text, m.index! + m[0].length - 1, [r.entry]);
  for (const line of imports) text = addImport(text, line);
  writeFileSync(file, text);
  said('updated', file, `imports ${r.entry}`);
  return true;
}

/** Names already in `env.public` in fluixi.config, or null when there is no such list. */
export function envPublicNames(configFile: string): string[] | null {
  if (!existsSync(configFile)) return null;
  const text = readFileSync(configFile, 'utf8');
  const m = text.match(/\bpublic\s*:\s*\[/);
  if (!m) return null;
  const open = m.index! + m[0].length - 1;
  const list = text.slice(open, closing(text, open) + 1);
  return [...list.matchAll(/['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g)].map((x) => x[1]);
}

/** Add names to `env.public`, skipping those already there. */
export function addEnvPublic(configFile: string, names: string[]): void {
  const have = envPublicNames(configFile);
  if (have === null) {
    if (!existsSync(configFile)) return hint(configFile, ['export default defineConfig({', `  env: { public: [${names.map((n) => `'${n}'`).join(', ')}] },`, '});']);
    return hint(configFile, [`env: { public: [${names.map((n) => `'${n}'`).join(', ')}] },`]);
  }
  const missing = names.filter((n) => !have.includes(n));
  if (!missing.length) return;
  const text = readFileSync(configFile, 'utf8');
  const m = text.match(/\bpublic\s*:\s*\[/)!;
  writeFileSync(configFile, appendToArray(text, m.index! + m[0].length - 1, missing.map((n) => `'${n}'`)));
  said('updated', configFile, `env.public + ${missing.join(', ')}`);
}

/** Append variables `.env.example` does not list yet, under a comment. */
export function addEnvExample(file: string, comment: string, vars: Record<string, string>): void {
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const have = new Set([...text.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map((m) => m[1]));
  const add = Object.entries(vars).filter(([k]) => !have.has(k) && !have.has(`VITE_${k}`));
  if (!add.length) return;
  const block = `${comment.split('\n').map((l) => `# ${l}`).join('\n')}\n${add.map(([k, v]) => `${k}=${v}`).join('\n')}\n`;
  writeFileSync(file, text ? `${text.replace(/\n*$/, '\n')}\n${block}` : block);
  said(text ? 'updated' : 'created', file, add.map(([k]) => k).join(', '));
}
