/**
 * Hands the app's document component to the server: the server entry re-exports it, with
 * `renderDocument` from the same bundle, so the document renders with the copy of
 * `@fluixi/dom` the app's own code uses. An app without a document is left as it was.
 */
import { resolve } from 'node:path';
import type { ResolvedConfig } from './config.js';

/** What the server entry re-exports for `createHandlerFrom` and the dev server. */
export const DOCUMENT_EXPORT = '__fluixiDocument';
export const RENDER_DOCUMENT_EXPORT = '__fluixiRenderDocument';

const SOURCE = /\.[cm]?[jt]sx?$/;
const stripExt = (file: string) => file.replace(/\?.*$/, '').replace(SOURCE, '');

export function documentVitePlugin(cfg: Pick<ResolvedConfig, 'root' | 'serverEntry' | 'document'>): any {
  const serverEntry = stripExt(resolve(cfg.root, cfg.serverEntry));
  return {
    name: 'fluixi-document',
    transform(code: string, id: string, options?: { ssr?: boolean }) {
      if (!cfg.document || !options?.ssr || stripExt(id) !== serverEntry) return null;
      const file = JSON.stringify(resolve(cfg.root, cfg.document));
      // Appended, so every line keeps its number and the entry's source map stays right.
      return {
        code:
          code +
          `\nexport { default as ${DOCUMENT_EXPORT} } from ${file};` +
          `\nexport { renderDocument as ${RENDER_DOCUMENT_EXPORT} } from '@fluixi/start/document';\n`,
        map: null,
      };
    },
  };
}
