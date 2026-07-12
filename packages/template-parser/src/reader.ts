/**
 * The lexing layer: a hole-aware cursor over the template's pieces.
 *
 * HTML-template lexing is mode-dependent — data text, tag soup, attribute
 * values, raw-text bodies and comments each lex by different rules, and a
 * `${…}` hole can land in the middle of any of them (`class="a ${x} b"`). A
 * single flat token array can't model that, so instead of pre-tokenizing we
 * expose hole-aware primitives the parser drives per mode. This is the
 * "tokenizer" in the classic sense: it owns character reads and hole
 * recognition; the parser owns structure.
 *
 * Input is a PIECE LIST rather than a stitched string: alternating static text
 * segments and atomic hole markers, each carrying its ABSOLUTE source offset.
 * That means every span the reader reports maps straight back to the original
 * file — no cooked-vs-raw length drift, no `\x00` sentinels. Structural
 * delimiters (`<`, `</`, `<!--`, `-->`, `/>`, `=`, quotes) are always contiguous
 * in source, so they never straddle a hole; within-segment peeking is enough.
 */
import type { SourceSpan } from './ast.js';

export type Piece =
  | { kind: 'static'; text: string; start: number }
  | { kind: 'hole'; index: number; start: number; end: number };

export interface HoleToken {
  index: number;
  loc: SourceSpan;
}

export class Reader {
  private pi = 0; // current piece index
  private oi = 0; // offset within the current static piece

  constructor(private pieces: Piece[]) {
    this.normalize();
  }

  /** Skip fully-consumed static pieces so `current()` is live text or a hole. */
  private normalize(): void {
    while (this.pi < this.pieces.length) {
      const p = this.pieces[this.pi];
      if (p.kind === 'static' && this.oi >= p.text.length) {
        this.pi++;
        this.oi = 0;
        continue;
      }
      break;
    }
  }

  eof(): boolean {
    return this.pi >= this.pieces.length;
  }

  /** Absolute source offset of the cursor. */
  pos(): number {
    if (this.eof()) {
      const last = this.pieces[this.pieces.length - 1];
      return last ? (last.kind === 'static' ? last.start + last.text.length : last.end) : 0;
    }
    const p = this.pieces[this.pi];
    return p.kind === 'static' ? p.start + this.oi : p.start;
  }

  /** True when the cursor sits exactly on a hole marker. */
  atHole(): boolean {
    return !this.eof() && this.pieces[this.pi].kind === 'hole';
  }

  /** True when advancing one char would land on a hole (e.g. the `<` in `<${Tag}`). */
  holeFollows(): boolean {
    if (this.eof()) return false;
    const p = this.pieces[this.pi];
    if (p.kind !== 'static') return false;
    if (this.oi + 1 < p.text.length) return false; // another char in this segment
    const next = this.pieces[this.pi + 1];
    return next !== undefined && next.kind === 'hole';
  }

  /** Consume the hole at the cursor. Caller must have checked {@link atHole}. */
  takeHole(): HoleToken {
    const p = this.pieces[this.pi];
    if (p.kind !== 'hole') throw new Error('takeHole called off a hole');
    this.pi++;
    this.oi = 0;
    this.normalize();
    return { index: p.index, loc: { start: p.start, end: p.end } };
  }

  /** Char `k` ahead within the current static segment, or '' at a boundary/hole. */
  peek(k = 0): string {
    if (this.eof()) return '';
    const p = this.pieces[this.pi];
    if (p.kind !== 'static') return '';
    return p.text[this.oi + k] ?? '';
  }

  /** Whether the current static segment starts with `s` at the cursor. */
  startsWith(s: string): boolean {
    if (this.eof()) return false;
    const p = this.pieces[this.pi];
    if (p.kind !== 'static') return false;
    return p.text.startsWith(s, this.oi);
  }

  /** Advance one character inside the current static segment. */
  advance(): string {
    if (this.eof()) return '';
    const p = this.pieces[this.pi];
    if (p.kind !== 'static') return '';
    const ch = p.text[this.oi++] ?? '';
    this.normalize();
    return ch;
  }

  /** Advance while `pred` holds and we stay inside one static segment. */
  readWhile(pred: (ch: string) => boolean): string {
    let out = '';
    while (!this.eof() && !this.atHole()) {
      const ch = this.peek();
      if (ch === '' || !pred(ch)) break;
      out += ch;
      this.oi++;
    }
    this.normalize();
    return out;
  }

  skipWhitespace(): void {
    this.readWhile((ch) => /\s/.test(ch));
  }

  span(start: number): SourceSpan {
    return { start, end: this.pos() };
  }
}
