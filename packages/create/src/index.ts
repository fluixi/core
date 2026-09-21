#!/usr/bin/env node
/**
 * `npm create fluixi <dir>`: scaffold a new Fluixi app. Prompts for a name, a mode
 * (SSR via @fluixi/start, or SPA via vite + @fluixi/vite-plugin), and a template syntax
 * (JSX or html``), unless given on the command line: `create-fluixi my-app --spa --html`
 * (`--ssr`/`--spa`, `--jsx`/`--html`). The html`` variant is JSX-free, plain `.ts`
 * sources, no `jsx` in tsconfig. Zero runtime deps, the styled prompts (gradient
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
      // Both names. A terminal sends `\r` and readline calls that `return`; a pty or a
      // piped answer sends `\n`, which it calls `enter`. Accepting only the first left
      // the prompt waiting for a key that never came.
      else if (k.name === 'return' || k.name === 'enter') { finish(); done(choices[idx].value); }
      else if (k.name === 'c' && k.ctrl) { finish(); output.write('\n'); exit(1); }
    };
    // Enter on a closed stream still means "take what is highlighted". Without this a
    // piped answer (`printf 'app\n\n\n' | create-fluixi`) drew the list and stopped.
    const onEnd = () => { finish(); done(choices[idx].value); };
    const finish = () => {
      input.off('keypress', onKey);
      input.off('end', onEnd);
      input.off('close', onEnd);
      if (input.isTTY) input.setRawMode(false);
      // Pause it again or the live stdin handle keeps the event loop alive and the CLI
      // never exits.
      input.pause();
      output.write(`${BAR}\n`);
    };
    // Already at EOF, so no event is coming: a fully buffered answer
    // (`printf 'app\n\n\n' | create-fluixi`) is consumed by the name prompt and the
    // stream ends before this one is set up. Take the highlighted value now.
    if (input.readableEnded) { finish(); done(choices[idx].value); return; }

    input.on('keypress', onKey);
    input.on('end', onEnd);
    input.on('close', onEnd);
    // The reason this prompt used to go nowhere. `askText` closes its readline
    // interface, which leaves stdin paused, and `emitKeypressEvents` only wires the
    // stream up the first time it is called. Attaching a listener to a paused stream
    // reads nothing, so no key ever arrived: the list drew with the first option
    // highlighted, the event loop drained, and the process exited 0 having created
    // nothing.
    input.resume();
  });
}

/**
 * What every @fluixi-ui app needs, and nothing more.
 *
 * The base layer: tokens and theme, the primitives and the behaviour they share, the
 * layout and animation helpers. No component package is here on purpose, an app installs
 * the ones it uses, and the resolver turns `<Button />` into an import from whichever it
 * installed.
 */
const UI_DEPS: Record<string, string> = {
  '@fluixi-ui/fx': 'alpha',
  '@fluixi-ui/interactions': 'alpha',
  '@fluixi-ui/kit': 'alpha',
  '@fluixi-ui/layout': 'alpha',
  '@fluixi-ui/polymorphic': 'alpha',
  '@fluixi-ui/primitives': 'alpha',
  '@fluixi-ui/theme': 'alpha',
  '@fluixi-ui/tokens': 'alpha',
};
/** Build-time only: it runs in the config, not in the app. */
const UI_DEV_DEPS: Record<string, string> = { '@fluixi-ui/resolver': 'alpha' };

/**
 * What `fluixi.d.ts` holds until the compiler regenerates it.
 *
 * Only the intrinsics: the component globals depend on which packages are installed and
 * on the resolver rules, so listing them here would go stale the moment a component is
 * added. The compiler rewrites the whole file on the first dev run.
 */
const INTRINSICS_DTS = `// GENERATED by @fluixi/compiler, do not edit.
//
// The reactive intrinsics, which the compiler lowers to their \`create*\` calls. They
// need no import. This file is rewritten on the first \`fluixi dev\`, which adds the
// components the resolver supplies without an import.
import * as __fluixi_reactive_signal from '@fluixi/reactive/signal';
import * as __fluixi_reactive_store from '@fluixi/reactive/store';

declare global {
  const $signal: typeof __fluixi_reactive_signal.signal;
  const $memo: typeof __fluixi_reactive_signal.memo;
  const $effect: typeof __fluixi_reactive_signal.effect;
  const $store: typeof __fluixi_reactive_store.store;
  const $resource: typeof __fluixi_reactive_signal.resource;
  const $selector: typeof __fluixi_reactive_signal.createSelector;
  const $deferred: typeof __fluixi_reactive_signal.createDeferred;
  const $untrack: typeof __fluixi_reactive_signal.untrack;
  const $untrackStore: typeof __fluixi_reactive_store.untrackStore;
}
`;

type Ui = 'none' | 'fluixi-ui';
type Css = 'none' | 'tailwind' | 'fluixi-css';

/** Add to a package.json section without dropping what the template already had. */
function addDeps(pkg: Record<string, any>, section: string, deps: Record<string, string>): void {
  pkg[section] = Object.fromEntries(
    Object.entries({ ...(pkg[section] ?? {}), ...deps }).sort(([a], [b]) => a.localeCompare(b)),
  );
}

/**
 * The app's own stylesheet, in the shape the chosen css engine expects.
 *
 * The component tokens are not here: they are a stylesheet the package ships and the
 * entry imports directly, so this file only holds what the engine has to read, the dark
 * variant, where to scan, and the theme the app defines.
 */
function styleSheet(ui: Ui, css: Css): string {
  // Dark from the attribute @fluixi/core's createTheme sets, not the OS preference, so
  // a theme toggle in the app actually drives it.
  const darkVariant = `@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));`;
  // Where to look for utility classes. Relative to this file.
  const sources = `@source '.';\n@source '../index.html';`;
  const theme = `@theme {\n  /* Design tokens. A --color-* scale here drives the whole app. */\n}`;

  if (css === 'fluixi-css') {
    // The layers are pulled in by directive rather than by import, and they come last:
    // `@theme` above has to be read before `utilities` is generated from it.
    return [
      darkVariant,
      '',
      sources,
      '',
      theme,
      '',
      '@fluixi base;',
      '@fluixi utilities;',
      '@fluixi components;',
      '',
    ].join('\n');
  }

  if (css === 'tailwind') {
    return [`@import 'tailwindcss';`, '', darkVariant, '', theme, ''].join('\n');
  }

  // No css engine: the component tokens are imported from the entry like any other
  // stylesheet, so there is nothing for this file to hold.
  return '';
}

/** Where the component resolver is configured, which differs by mode. */
const configFor = (mode: 'ssr' | 'spa') =>
  mode === 'ssr' ? 'fluixi.config.ts' : 'vite.config.ts';

/**
 * Let a capitalised tag resolve to a @fluixi-ui package.
 *
 * Added alongside the rule the template ships rather than replacing it, so a local
 * `src/components/Card.tsx` still wins and only the names it does not define fall
 * through to the kit.
 */
function addUiResolver(target: string, mode: 'ssr' | 'spa'): void {
  const file = join(target, configFor(mode));
  if (!existsSync(file)) return;
  let src = readFileSync(file, 'utf8');
  src = `import { uiComponents } from '@fluixi-ui/resolver';\n` + src;
  src = src.replace(
    "resolve: [{ match: /^([A-Z]\\w+)$/, module: '/src/components/$1.tsx' }]",
    "resolve: [{ match: /^([A-Z]\\w+)$/, module: '/src/components/$1.tsx' }, uiComponents()]",
  );
  writeFileSync(file, src);
}

/**
 * Put a plugin in the app's vite config.
 *
 * An SSR app has none by default, because @fluixi/start owns the build. It still reads
 * one when it is there, so a css engine that ships a vite plugin gets a file created for
 * it rather than having nowhere to go.
 */
function addVitePlugin(target: string, mode: 'ssr' | 'spa', importLine: string, call: string): void {
  // A start app declares extra plugins in its own config; it has no vite config, and
  // adding one just to hold a plugin would leave the project with two build configs
  // that have to agree.
  const file = join(target, configFor(mode));
  if (!existsSync(file)) return;

  let src = importLine + '\n' + readFileSync(file, 'utf8');
  src =
    mode === 'ssr'
      ? src.replace('export default defineConfig({', `export default defineConfig({\n  plugins: [${call}],`)
      : src.replace('plugins: [', `plugins: [\n    ${call},`);
  writeFileSync(file, src);
}

/**
 * Import the stylesheets from whichever file boots the client.
 *
 * The component tokens come first and from the entry rather than from `styles.css`:
 * they are a stylesheet the package ships, not something the app's css engine should be
 * asked to resolve, and the components below need them defined before their own rules
 * land. `emitUiTokens` does not replace this, that bridge covers a subset.
 */
function importStyles(target: string, mode: 'ssr' | 'spa', ui: Ui): void {
  const base = mode === 'ssr' ? 'entry-client' : 'main';
  const file = ['tsx', 'ts']
    .map((ext) => join(target, 'src', `${base}.${ext}`))
    .find((p) => existsSync(p));
  if (!file) return;

  const head = [
    ...(ui === 'fluixi-ui' ? [`import '@fluixi-ui/tokens/tokens.css';`] : []),
    `import './styles.css';`,
    '',
  ].join('\n');
  writeFileSync(file, head + readFileSync(file, 'utf8'));
}

async function main(): Promise<void> {
  const args = argv.slice(2);
  let dir = args.find((a) => !a.startsWith('-'));
  let mode: 'ssr' | 'spa' | undefined =
    args.includes('--spa') ? 'spa' : args.includes('--ssr') ? 'ssr' : undefined;
  let format: 'jsx' | 'html' | undefined =
    args.includes('--html') ? 'html' : args.includes('--jsx') ? 'jsx' : undefined;
  let ui: Ui | undefined =
    args.includes('--ui') ? 'fluixi-ui' : args.includes('--no-ui') ? 'none' : undefined;
  let css: Css | undefined =
    args.includes('--tailwind') ? 'tailwind'
    : args.includes('--fluixi-css') ? 'fluixi-css'
    : args.includes('--no-css') ? 'none'
    : undefined;

  const interactive = input.isTTY && (!dir || !mode || !format || !ui || !css);
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
    if (!ui) {
      ui = (await askSelect('Component library', [
        { value: 'none', label: 'None', hint: 'bring your own components' },
        { value: 'fluixi-ui', label: '@fluixi-ui', hint: 'kit + tokens · install components as you need them' },
      ])) as Ui;
    }
    if (!css) {
      css = (await askSelect('Styling', [
        { value: 'none', label: 'None', hint: 'plain css' },
        { value: 'tailwind', label: 'Tailwind CSS', hint: 'v4 · via @tailwindcss/vite' },
        { value: 'fluixi-css', label: '@fluixi-css', hint: 'the Fluixi stylesheet' },
      ])) as Css;
    }
  }
  dir = dir ?? 'fluixi-app';
  mode = mode ?? 'ssr';
  format = format ?? 'jsx';
  ui = ui ?? 'none';
  css = css ?? 'none';

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

  // The ambient declarations for the `$` intrinsics.
  //
  // The compiler rewrites this file on the first `fluixi dev`, adding whatever the
  // resolver supplies without an import. Shipping it now means an editor knows what
  // `$signal` is before the app has ever been run, instead of reporting "Cannot find
  // name" across a project that compiles.
  writeFileSync(join(target, 'fluixi.d.ts'), INTRINSICS_DTS);

  const pkgPath = join(target, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.name = name;

  if (ui === 'fluixi-ui') {
    addDeps(pkg, 'dependencies', UI_DEPS);
    addDeps(pkg, 'devDependencies', UI_DEV_DEPS);
    addUiResolver(target, mode);
  }

  if (css === 'tailwind') {
    addDeps(pkg, 'devDependencies', { tailwindcss: '^4', '@tailwindcss/vite': '^4' });
    addVitePlugin(target, mode, `import tailwindcss from '@tailwindcss/vite';`, 'tailwindcss()');
  }

  if (css === 'fluixi-css') {
    addDeps(pkg, 'dependencies', { '@fluixi-css/core': 'next' });
    addDeps(pkg, 'devDependencies', { '@fluixi-css/vite': 'next', lightningcss: '^1.29.3' });
    addVitePlugin(
      target,
      mode,
      `import fluixiCss from '@fluixi-css/vite';`,
      // The bridge only matters with the component kit installed: it maps the theme
      // scales onto the `--flx-ui-*` custom properties those components read.
      `fluixiCss({ reset: true${ui === 'fluixi-ui' ? ', emitUiTokens: true' : ''} })`,
    );
    // No `fluixi.css.config.js`: `@theme`, `@source` and `@custom-variant` in the
    // stylesheet say the same things, and a project with both has two places to change
    // one colour. The config file is still read when an app adds one.
  }

  if (ui === 'fluixi-ui' || css !== 'none') {
    const sheet = styleSheet(ui, css);
    // An empty sheet still gets written: it is where an app puts its own css, and the
    // entry already imports it.
    writeFileSync(join(target, 'src', 'styles.css'), sheet);
    importStyles(target, mode, ui);
  }

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
