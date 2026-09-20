/**
 * Zero-dependency terminal UI for the Fluixi CLI, colors, the wordmark, and the
 * dev-server "ready" panel. Everything degrades to plain text when stdout is not a
 * TTY, when `NO_COLOR` is set, or under a dumb terminal, so logs/pipes stay clean.
 */
import { networkInterfaces } from 'node:os';

const COLOR =
  process.env.NO_COLOR || process.env.FORCE_COLOR === '0'
    ? false
    : (!!process.stdout.isTTY || !!process.env.FORCE_COLOR) && process.env.TERM !== 'dumb';

const sgr =
  (open: number, close: number) =>
  (s: string | number): string =>
    COLOR ? `\x1b[${open}m${s}\x1b[${close}m` : `${s}`;

/** Basic ANSI color/style helpers. No-ops when color is disabled. */
export const c = {
  bold: sgr(1, 22),
  dim: sgr(2, 22),
  italic: sgr(3, 23),
  underline: sgr(4, 24),
  red: sgr(31, 39),
  green: sgr(32, 39),
  yellow: sgr(33, 39),
  blue: sgr(34, 39),
  magenta: sgr(35, 39),
  cyan: sgr(36, 39),
  gray: sgr(90, 39),
};

/** Truecolor foreground (24-bit). Falls back to no color when disabled. */
const rgb =
  (r: number, g: number, b: number) =>
  (s: string): string =>
    COLOR ? `\x1b[38;2;${r};${g};${b}m${s}\x1b[39m` : s;

// Brand gradient (cyan → violet), applied per-character across a short string.
const BRAND: [number, number, number][] = [
  [34, 211, 238], // cyan-400
  [56, 189, 248],
  [129, 140, 248],
  [167, 139, 250],
  [192, 132, 252], // violet-400
  [217, 130, 245],
];

function gradient(text: string): string {
  if (!COLOR) return text;
  const chars = [...text];
  return chars
    .map((ch, i) => {
      const [r, g, b] = BRAND[Math.min(BRAND.length - 1, Math.floor((i / Math.max(1, chars.length - 1)) * (BRAND.length - 1)))];
      return rgb(r, g, b)(ch);
    })
    .join('');
}

/** The brand wordmark: a gradient diamond + bold "fluixi" + dim version. */
export function wordmark(version?: string): string {
  const mark = `${gradient('◆')} ${c.bold(gradient('fluixi'))}`;
  return version ? `${mark} ${c.dim(`v${version}`)}` : mark;
}

const SYM = {
  arrow: c.gray('➜'),
  ok: c.green('✓'),
  err: c.red('✗'),
};

/** First non-internal IPv4 address, for the dev "Network" URL. */
function networkAddress(): string | null {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of (list ?? []) as Array<{ family: string | number; internal: boolean; address: string }>) {
      const family = typeof net.family === 'string' ? net.family : `IPv${net.family}`;
      if (family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

/** The dev-server "ready" panel: wordmark + timing + Local/Network URLs. */
export function devReady(opts: { port: number; startedAt: number; version?: string }): void {
  const ms = Date.now() - opts.startedAt;
  const local = `http://localhost:${opts.port}/`;
  const net = networkAddress();
  const link = (u: string) => c.cyan(c.underline(u));
  const label = (s: string) => c.gray(s.padEnd(8));

  const lines = [
    '',
    `  ${wordmark(opts.version)}  ${c.gray(`dev ready in ${c.bold(String(ms))} ms`)}`,
    '',
    `  ${SYM.arrow} ${label('Local')} ${link(local)}`,
    net
      ? `  ${SYM.arrow} ${label('Network')} ${link(`http://${net}:${opts.port}/`)}`
      : `  ${SYM.arrow} ${label('Network')} ${c.dim('not exposed')}`,
    '',
  ];
  process.stdout.write(lines.join('\n') + '\n');
}

/** A build step line (e.g. "building client …"). */
export function step(text: string): void {
  process.stdout.write(`  ${c.cyan('•')} ${text}\n`);
}

/** A success line. */
export function done(text: string): void {
  process.stdout.write(`  ${SYM.ok} ${text}\n`);
}

/** An error line (to stderr). */
export function fail(text: string): void {
  process.stderr.write(`  ${SYM.err} ${c.red(text)}\n`);
}

export { SYM as symbols };
