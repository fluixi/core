/**
 * Whitespace handling for template text runs.
 *
 * JSX and `` html`...` `` collapse a text run the same way — the rule came from
 * JSX and the template syntax adopted it so an author moving between the two
 * gets the same output. It is pure string work with no parser in it, so it lives
 * here rather than in a front-end, where both can reach it and neither owns it.
 */
/** Canonical JSX text cleaning — kept identical to plugin.ts cleanTemplateText. */
export function cleanTemplateText(value: string): string {
  const lines = value.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/[^ \t]/.test(lines[i])) lastNonEmpty = i;
  }
  let out = '';
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\t/g, ' ');
    if (i !== 0) line = line.replace(/^ +/, '');
    if (i !== lines.length - 1) line = line.replace(/ +$/, '');
    if (!line) continue;
    if (i !== lastNonEmpty) line += ' ';
    out += line;
  }
  return out;
}

