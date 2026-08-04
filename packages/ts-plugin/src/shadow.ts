/**
 * Deep template checking on ONE program.
 *
 * The previous design ran a second `ts.LanguageService` over the same files. That
 * doubles the expensive part — parsing and binding lib.d.ts and every `node_modules`
 * declaration — because a second service means a second document registry.
 *
 * Instead, each file containing templates gets a SHADOW file added to the existing
 * program: a copy of the source with every html`` replaced by typed helper calls
 * (see ./virtual). Locals stay in scope because the shadow is a copy of the whole
 * file, and lib/node_modules are parsed once because there is only one program.
 *
 * Why not replace the real file's text, the way Volar does for `.vue`? Because a
 * plugin proxies a language service whose every API would then speak generated
 * coordinates. Miss one — `getFormattingEditsForDocument`, `findRenameLocations` —
 * and the editor applies edits at the wrong offsets and corrupts the file. Here the
 * real file keeps real positions, and only diagnostics we explicitly ask for on the
 * shadow are mapped back. Nothing can write to the wrong place.
 */
import type * as TS from 'typescript';
import { buildVirtual, inHole, inKey, toSource, type Segment } from './virtual.js';

const SUFFIX = '.__fx.ts';

export function isShadowPath(fileName: string): boolean {
  return fileName.endsWith(SUFFIX);
}

function shadowPathFor(fileName: string): string {
  return fileName + SUFFIX;
}

function sourcePathFor(shadow: string): string {
  return shadow.slice(0, -SUFFIX.length);
}

interface Built {
  version: string;
  text: string;
  segments: Segment[];
}

export class ShadowFiles {
  private built = new Map<string, Built>();
  /** Source files known to contain no templates, so we skip building a shadow. */
  private barren = new Map<string, string>();

  constructor(
    private ts: typeof TS,
    private host: TS.LanguageServiceHost,
  ) {
    this.patchHost();
  }

  /**
   * Teach the existing host about shadow paths. The language service holds this
   * host object, so overriding its methods in place is enough — no second service.
   */
  private patchHost(): void {
    const ts = this.ts;
    const host = this.host as TS.LanguageServiceHost & Record<string, unknown>;
    const self = this;

    const originalNames = host.getScriptFileNames.bind(host);
    host.getScriptFileNames = () => {
      const names = originalNames();
      const out = names.slice();
      for (const name of names) {
        if (!isShadowPath(name) && self.build(name)) out.push(shadowPathFor(name));
      }
      return out;
    };

    const originalSnapshot = host.getScriptSnapshot.bind(host);
    host.getScriptSnapshot = (fileName: string) => {
      if (!isShadowPath(fileName)) return originalSnapshot(fileName);
      const built = self.build(sourcePathFor(fileName));
      return built ? ts.ScriptSnapshot.fromString(built.text) : undefined;
    };

    const originalVersion = host.getScriptVersion.bind(host);
    host.getScriptVersion = (fileName: string) =>
      isShadowPath(fileName) ? originalVersion(sourcePathFor(fileName)) : originalVersion(fileName);

    if (typeof host.fileExists === 'function') {
      const originalExists = (host.fileExists as (f: string) => boolean).bind(host);
      host.fileExists = (fileName: string) =>
        isShadowPath(fileName) ? !!self.build(sourcePathFor(fileName)) : originalExists(fileName);
    }
  }

  /** Build (and cache per source version) the shadow text for a file. */
  private build(fileName: string): Built | undefined {
    const version = this.host.getScriptVersion(fileName);
    if (this.barren.get(fileName) === version) return undefined;

    const hit = this.built.get(fileName);
    if (hit && hit.version === version) return hit;

    const snapshot = this.host.getScriptSnapshot(fileName);
    if (!snapshot) return undefined;
    const text = snapshot.getText(0, snapshot.getLength());
    // Cheap pre-filter: no tag, no shadow, no parse.
    if (text.indexOf('html`') === -1 && text.indexOf('svg`') === -1) {
      this.barren.set(fileName, version);
      this.built.delete(fileName);
      return undefined;
    }

    const sf = this.ts.createSourceFile(fileName, text, this.ts.ScriptTarget.Latest, true);
    const virtual = buildVirtual(this.ts, sf);
    if (!virtual) {
      this.barren.set(fileName, version);
      this.built.delete(fileName);
      return undefined;
    }

    // A file with no import/export is a SCRIPT, so its top-level declarations are
    // global — and the shadow, being a copy, would collide with every one of them.
    // Appending an empty export makes the shadow a module; it goes at the end, so
    // no mapped position moves.
    const entry: Built = {
      version,
      text: virtual.text + '\nexport {};\n',
      segments: virtual.segments,
    };
    this.built.set(fileName, entry);
    return entry;
  }

  /** The shadow path for a source file, when it has one. */
  shadowFor(fileName: string): string | undefined {
    return this.build(fileName) ? shadowPathFor(fileName) : undefined;
  }

  segmentsFor(fileName: string): Segment[] | undefined {
    return this.build(fileName)?.segments;
  }

  toSrc(fileName: string, position: number): number {
    const segments = this.segmentsFor(fileName);
    return segments ? toSource(segments, position) : -1;
  }

  inHole(fileName: string, position: number): boolean {
    const segments = this.segmentsFor(fileName);
    return !!segments && inHole(segments, position);
  }

  inKey(fileName: string, position: number): boolean {
    const segments = this.segmentsFor(fileName);
    return !!segments && inKey(segments, position);
  }
}
