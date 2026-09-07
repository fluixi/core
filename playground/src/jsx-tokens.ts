// JSX colouring for the TypeScript editor.
//
// Monaco ships a monarch tokenizer for typescript that predates jsx: `<div class="card">`
// comes out as a comparison, an identifier and a string, so a component reads as flat text
// next to the html it produces. Rather than register a separate `tsx` language — which would
// take the models out from under the TypeScript worker, and with it every completion and
// type the playground exists to show — the same language gets a tokenizer that also knows
// about tags.
//
// Where a tag begins is a guess: monarch has no lookbehind, so `<` starting a tag is told
// apart from less-than by what follows it. `a < b` is untouched; `a <b` would be read as a
// tag, which is not how anyone writes a comparison.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

type Monarch = monaco.languages.IMonarchLanguage & {
  tokenizer: Record<string, monaco.languages.IMonarchLanguageRule[]>;
};

const TAG_OPEN = /<([A-Z][\w.$]*|[a-z][\w.-]*)(?=[\s/>])/;
const TAG_CLOSE = /<\/([A-Z][\w.$]*|[a-z][\w.-]*)\s*>/;
const FRAGMENT = /<>|<\/>/;

const JSX_STATES: Record<string, monaco.languages.IMonarchLanguageRule[]> = {
  // Inside `<tag …>`, up to the closing bracket.
  jsxTag: [
    [/\s+/, ''],
    [/[A-Za-z_$][\w$-]*(?=\s*=)/, 'attribute.name'],
    [/[A-Za-z_$][\w$-]*/, 'attribute.name'],
    [/=/, 'delimiter'],
    [/"[^"]*"/, 'attribute.value'],
    [/'[^']*'/, 'attribute.value'],
    [/\{/, { token: 'delimiter.bracket', next: '@jsxExpression', bracket: '@open' }],
    [/\/?>/, { token: 'tag', next: '@pop' }],
  ],
  // `{ … }` inside a tag is ordinary code, braces and all.
  jsxExpression: [
    [/\{/, { token: 'delimiter.bracket', next: '@jsxExpression', bracket: '@open' }],
    [/\}/, { token: 'delimiter.bracket', next: '@pop', bracket: '@close' }],
    { include: 'common' },
  ],
};

const JSX_RULES: monaco.languages.IMonarchLanguageRule[] = [
  [FRAGMENT, 'tag'],
  [TAG_CLOSE, 'tag'],
  [TAG_OPEN, { token: 'tag', next: '@jsxTag' }],
];

/** Colours for the tag tokens, since the base themes only style them for html. */
export const JSX_THEME_RULES: monaco.editor.ITokenThemeRule[] = [
  { token: 'tag', foreground: '7ee787' },
  { token: 'attribute.name', foreground: 'd2a8ff' },
  { token: 'attribute.value', foreground: 'a5d6ff' },
];

export const JSX_THEME_RULES_LIGHT: monaco.editor.ITokenThemeRule[] = [
  { token: 'tag', foreground: '116329' },
  { token: 'attribute.name', foreground: '8250df' },
  { token: 'attribute.value', foreground: '0a3069' },
];

let building: Promise<monaco.languages.IMonarchLanguage | null> | null = null;

/** Monaco's own typescript definition, with the tag rules in front of it. */
function build(): Promise<monaco.languages.IMonarchLanguage | null> {
  const typescript = monaco.languages.getLanguages().find((l) => l.id === 'typescript');
  const loader = (typescript as { loader?: () => Promise<{ language: Monarch }> } | undefined)?.loader;
  if (!loader) return Promise.resolve(null);

  return loader().then(({ language }) => {
    const tokenizer: Record<string, monaco.languages.IMonarchLanguageRule[]> = {};
    for (const [state, rules] of Object.entries(language.tokenizer)) tokenizer[state] = [...rules];
    // In front of `common`, which is where `<` would otherwise be read as an operator.
    tokenizer.common = [...JSX_RULES, ...(tokenizer.common ?? [])];
    Object.assign(tokenizer, JSX_STATES);
    return { ...language, tokenizer };
  });
}

/**
 * Teach the typescript tokenizer about jsx.
 *
 * Applied twice on purpose. Monaco registers the language's own tokenizer lazily, the first
 * time something asks for it, and that can land either side of this — which is why the same
 * build highlighted jsx on one dev server and not on another. Re-applying when the language
 * comes up makes the order stop mattering.
 */
export function patchTypeScriptTokens(): void {
  const apply = (): void => {
    void (building ??= build()).then((language) => {
      if (language) monaco.languages.setMonarchTokensProvider('typescript', language);
    });
  };
  apply();
  monaco.languages.onLanguage('typescript', apply);
}
