#!/usr/bin/env node
/**
 * `npm create fluixi <dir>` — scaffold a new Fluixi app. Prompts for a name, a mode
 * (SSR via @fluixi/start, or SPA via vite + @fluixi/vite-plugin), and a template syntax
 * (JSX or html``), unless given on the command line: `create-fluixi my-app --spa --html`
 * (`--ssr`/`--spa`, `--jsx`/`--html`). The html`` variant is JSX-free — plain `.ts`
 * sources, no `jsx` in tsconfig. Zero runtime deps — the styled prompts (gradient
 * wordmark, gutter, arrow-key select) are hand-rolled ANSI.
 */
import { cpSync, renameSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { emitKeypressEvents } from 'node:readline';
import { stdin as input, stdout as output, argv, exit, env } from 'node:process';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// ── tiny zero-dep ANSI styling ──────────────────────────────────────────────
const COLOR =
  env.NO_COLOR || env.FORCE_COLOR === '0'
    ? false
    : (!!output.isTTY || !!env.FORCE_COLOR) && env.TERM !== 'dumb';
const sgr = (o: number, x: number) => (s: string | number) => (COLOR ? `\x1b[${o}m${s}\x1b[${x}m` : `${s}`);
const c = {
  bold: sgr(1, 22), dim: sgr(2, 22), green: sgr(32, 39), yellow: sgr(33, 39),
  cyan: sgr(36, 39), gray: sgr(90, 39), red: sgr(31, 39),
};
const rgb = (r: number, g: number, b: number) => (s: string) => (COLOR ? `\x1b[38;2;${r};${g};${b}m${s}\x1b[39m` : s);
const BRAND: [number, number, number][] = [
  [34, 211, 238], [56, 189, 248], [129, 140, 248], [167, 139, 250], [192, 132, 252],
];
const gradient = (text: string) => {
  if (!COLOR) return text;
  const ch = [...text];
  return ch.map((x, i) => {
    const [r, g, b] = BRAND[Math.min(BRAND.length - 1, Math.floor((i / Math.max(1, ch.length - 1)) * (BRAND.length - 1)))];
    return rgb(r, g, b)(x);
  }).join('');
};
const BAR = c.gray('│');

// ── interactive prompt primitives (clack-style gutter) ──────────────────────
async function askText(label: string, fallback: string): Promise<string> {
  output.write(`${c.green('◇')}  ${c.bold(label)} ${c.gray(`(${fallback})`)}\n`);
  const rl = createInterface({ input, output });
  const answer = (await rl.question(`${BAR}  `)).trim();
  rl.close();
  output.write(`${BAR}\n`);
  return answer || fallback;
}

interface Choice { value: string; label: string; hint: string; }
function askSelect(label: string, choices: Choice[]): Promise<string> {
  return new Promise((done) => {
    let idx = 0;
    output.write(`${c.green('◆')}  ${c.bold(label)}\n`);
    const draw = (first: boolean) => {
      if (!first) output.write(`\x1b[${choices.length}A`);
      for (let i = 0; i < choices.length; i++) {
        const on = i === idx;
        const dot = on ? c.green('●') : c.gray('○');
        const name = on ? c.cyan(c.bold(choices[i].label)) : choices[i].label;
        output.write(`\x1b[2K${BAR}  ${dot} ${name}  ${c.gray(choices[i].hint)}\n`);
      }
    };
    draw(true);
    emitKeypressEvents(input);
    if (input.isTTY) input.setRawMode(true);
    const onKey = (_s: string, k: { name?: string; ctrl?: boolean }) => {
      if (k.name === 'up' || k.name === 'k') { idx = (idx - 1 + choices.length) % choices.length; draw(false); }
      else if (k.name === 'down' || k.name === 'j') { idx = (idx + 1) % choices.length; draw(false); }
      else if (k.name === 'return') { finish(); done(choices[idx].value); }
      else if (k.name === 'c' && k.ctrl) { finish(); output.write('\n'); exit(1); }
    };
    const finish = () => {
      input.off('keypress', onKey);
      if (input.isTTY) input.setRawMode(false);
      // emitKeypressEvents() resumed stdin to read keys; pause it again or the
      // live stdin handle keeps the event loop alive and the CLI never exits.
      input.pause();
      output.write(`${BAR}\n`);
    };
    input.on('keypress', onKey);
  });
}

async function main(): Promise<void> {
  const args = argv.slice(2);
  let dir = args.find((a) => !a.startsWith('-'));
  let mode: 'ssr' | 'spa' | undefined =
    args.includes('--spa') ? 'spa' : args.includes('--ssr') ? 'ssr' : undefined;
  let format: 'jsx' | 'html' | undefined =
    args.includes('--html') ? 'html' : args.includes('--jsx') ? 'jsx' : undefined;

  const interactive = input.isTTY && (!dir || !mode || !format);
  if (interactive) {
    output.write(`\n${c.gray('┌')}  ${gradient('◆')} ${c.bold(gradient('create-fluixi'))}\n${BAR}\n`);
    if (!dir) dir = await askText('Project name', 'fluixi-app');
    if (!mode) {
      mode = (await askSelect('App mode', [
        { value: 'ssr', label: 'SSR', hint: 'server-rendered · @fluixi/start' },
        { value: 'spa', label: 'SPA', hint: 'client-only · vite' },
      ])) as 'ssr' | 'spa';
    }
    if (!format) {
      format = (await askSelect('Template syntax', [
        { value: 'jsx', label: 'JSX', hint: 'default · .tsx · html`` works inline too' },
        { value: 'html', label: 'html``', hint: 'no JSX · plain .ts · @fluixi/ts-plugin' },
      ])) as 'jsx' | 'html';
    }
  }
  dir = dir ?? 'fluixi-app';
  mode = mode ?? 'ssr';
  format = format ?? 'jsx';

  const target = resolve(dir);
  const name = basename(target);
  if (existsSync(target)) {
    output.write(`${c.gray('└')}  ${c.red('✗')} "${c.bold(name)}" already exists — pick another name or remove it.\n\n`);
    exit(1);
  }

  const template = `../template-${mode}${format === 'html' ? '-html' : ''}`;
  cpSync(here(template), target, { recursive: true });

  // npm strips a real .gitignore from published packages → restore it from _gitignore.
  const gi = join(target, '_gitignore');
  if (existsSync(gi)) renameSync(gi, join(target, '.gitignore'));

  const pkgPath = join(target, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.name = name;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // Outro + next steps. The leading gutter only makes sense after the intro/prompts.
  const tag = `${c.cyan(mode.toUpperCase())} ${c.gray('·')} ${c.cyan(format === 'html' ? 'html``' : 'JSX')}`;
  if (interactive) output.write(`${BAR}\n`);
  else output.write('\n');
  output.write(`${c.green('◇')}  ${c.green('Created')} ${c.bold(name)} ${c.gray('·')} ${tag}\n${c.gray('└')}\n\n`);
  output.write(`  ${c.bold('Next')}\n`);
  output.write(`    ${c.gray('›')} cd ${dir}\n`);
  output.write(`    ${c.gray('›')} ${c.cyan('pnpm install')} ${c.gray('# or npm / yarn')}\n`);
  output.write(`    ${c.gray('›')} ${c.cyan('pnpm dev')}\n\n`);
}

main();
