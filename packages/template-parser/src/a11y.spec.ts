import { describe, it, expect } from 'vitest';
import { parse, parseTemplate, piecesFromStrings } from './index.js';

const codes = (template: string): string[] =>
  parse([template]).diagnostics.filter((d) => d.code.startsWith('a11y-')).map((d) => d.code);

/** Multi-segment statics, so the gaps between them are real `${…}` holes. */
const spreadCodes = (statics: string[]): string[] =>
  parse(statics).diagnostics.filter((d) => d.code.startsWith('a11y-')).map((d) => d.code);

describe('images', () => {
  it('reports an img with no alt', () => {
    expect(codes('<img src="a.png">')).toContain('a11y-img-alt');
  });

  it('accepts an empty alt, which is how decoration is marked', () => {
    expect(codes('<img src="a.png" alt="">')).toEqual([]);
  });

  it('accepts an image hidden from the accessibility tree', () => {
    expect(codes('<img src="a.png" role="presentation">')).toEqual([]);
    expect(codes('<img src="a.png" aria-hidden="true">')).toEqual([]);
  });
});

describe('anchors', () => {
  it('reports an anchor with no href', () => {
    expect(codes('<a>click</a>')).toContain('a11y-anchor-href');
  });

  it('accepts an anchor with an href', () => {
    expect(codes('<a href="/x">go</a>')).toEqual([]);
  });
});

describe('iframes', () => {
  it('reports a missing title', () => {
    expect(codes('<iframe src="/x"></iframe>')).toContain('a11y-iframe-title');
  });
});

describe('tabindex', () => {
  it('reports a positive tabindex', () => {
    expect(codes('<div tabindex="3">x</div>')).toContain('a11y-positive-tabindex');
  });

  it('accepts 0 and -1', () => {
    expect(codes('<div tabindex="0">x</div>')).toEqual([]);
    expect(codes('<div tabindex="-1">x</div>')).toEqual([]);
  });
});

describe('click handlers', () => {
  it('reports a click handler on a plain element', () => {
    expect(codes('<div @click=${f}>x</div>')).toContain('a11y-click-without-keyboard');
  });

  it('accepts a button, which is already keyboard-reachable', () => {
    expect(codes('<button @click=${f}>x</button>')).toEqual([]);
  });

  it('accepts a plain element given a role and a key handler', () => {
    expect(codes('<div role="button" @click=${f} @keydown=${k}>x</div>')).toEqual([]);
  });

  it('recognises the onClick spelling too', () => {
    expect(codes('<div onClick=${f}>x</div>')).toContain('a11y-click-without-keyboard');
  });
});

describe('restraint', () => {
  it('says nothing about an element carrying a spread', () => {
    // The spread may supply alt/href/title: there is no way to know here, and a
    // warning that can't be acted on is worse than silence.
    expect(spreadCodes(['<img ...', '>'])).toEqual([]);
    expect(spreadCodes(['<a ...', '>x</a>'])).toEqual([]);
  });

  it('checks nested elements, not just the top level', () => {
    expect(codes('<section><div><img src="a.png"></div></section>')).toContain('a11y-img-alt');
  });

  it('reports as warnings, never errors', () => {
    const diagnostics = parse(['<img src="a.png">']).diagnostics;
    expect(diagnostics.every((d) => d.severity === 'warning')).toBe(true);
  });

  it('can be turned off', () => {
    const result = parseTemplate(piecesFromStrings(['<img src="a.png">']), { accessibility: false });
    expect(result.diagnostics).toEqual([]);
  });
});
