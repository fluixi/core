/**
 * The interactive prompts create-fluixi and `fluixi add` share: a text answer and an
 * arrow-key choice, drawn in the clack-style gutter. Zero dependencies, hand-rolled ANSI.
 */
import { createInterface } from 'node:readline/promises';
import { emitKeypressEvents } from 'node:readline';
import { stdin as input, stdout as output, exit, env } from 'node:process';

const COLOR =
  env.NO_COLOR || env.FORCE_COLOR === '0'
    ? false
    : (!!output.isTTY || !!env.FORCE_COLOR) && env.TERM !== 'dumb';
const sgr = (o: number, x: number) => (s: string | number) => (COLOR ? `\x1b[${o}m${s}\x1b[${x}m` : `${s}`);
const c = { bold: sgr(1, 22), green: sgr(32, 39), cyan: sgr(36, 39), gray: sgr(90, 39) };
export const BAR = c.gray('│');

export async function askText(label: string, fallback: string): Promise<string> {
  output.write(`${c.green('◇')}  ${c.bold(label)} ${c.gray(`(${fallback})`)}\n`);
  const rl = createInterface({ input, output });
  const answer = (await rl.question(`${BAR}  `)).trim();
  rl.close();
  output.write(`${BAR}\n`);
  return answer || fallback;
}

export interface Choice { value: string; label: string; hint: string; }
export function askSelect(label: string, choices: Choice[]): Promise<string> {
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
