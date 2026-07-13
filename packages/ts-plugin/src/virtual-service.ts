/**
 * The virtual language service: a second `ts.LanguageService` that sees the
 * VIRTUAL text (templates turned into typed helper calls by `buildVirtual`) for
 * every file, and delegates everything else to the real host. The plugin routes
 * hover / completion / diagnostics through it, mapping positions with the
 * per-file {@link Segment} map so results land back on the real template.
 */
import type * as TS from 'typescript';
import { buildVirtual, toGenerated, toSource, type Segment } from './virtual.js';

export class VirtualService {
  private ls: TS.LanguageService;
  /** Cached per file: the virtual text + segments, keyed by the file's version. */
  private cache = new Map<string, { version: string; text: string; segments: Segment[] }>();

  constructor(private ts: typeof TS, private host: TS.LanguageServiceHost) {
    const self = this;
    const virtualHost: TS.LanguageServiceHost = {
      ...host,
      getScriptSnapshot(fileName) {
        const v = self.virtual(fileName);
        if (v) return self.ts.ScriptSnapshot.fromString(v.text);
        return host.getScriptSnapshot(fileName);
      },
      getScriptVersion(fileName) {
        // Bump when the source changes; the virtual text is derived from it.
        return host.getScriptVersion(fileName);
      },
    };
    // Bind through-methods so the host keeps working (project references etc.).
    for (const key of Object.keys(host) as Array<keyof TS.LanguageServiceHost>) {
      const member = host[key];
      if (typeof member === 'function' && !(key in virtualHost && virtualHost[key] !== host[key])) {
        (virtualHost as Record<string, unknown>)[key] = (member as Function).bind(host);
      }
    }
    virtualHost.getScriptSnapshot = ((fileName: string) => {
      const v = self.virtual(fileName);
      return v ? self.ts.ScriptSnapshot.fromString(v.text) : host.getScriptSnapshot(fileName);
    }) as TS.LanguageServiceHost['getScriptSnapshot'];

    this.ls = ts.createLanguageService(virtualHost, ts.createDocumentRegistry());
  }

  /** The virtual doc for a file (built + cached per source version), if it has templates. */
  private virtual(fileName: string): { text: string; segments: Segment[] } | undefined {
    const version = this.host.getScriptVersion(fileName);
    const hit = this.cache.get(fileName);
    if (hit && hit.version === version) return hit.text ? hit : undefined;

    const snap = this.host.getScriptSnapshot(fileName);
    if (!snap) return undefined;
    const src = snap.getText(0, snap.getLength());
    const sf = this.ts.createSourceFile(fileName, src, this.ts.ScriptTarget.Latest, true, scriptKind(this.ts, fileName));
    const v = buildVirtual(this.ts, sf);
    // Store even a miss (empty text) so we don't rebuild every call.
    this.cache.set(fileName, { version, text: v?.text ?? '', segments: v?.segments ?? [] });
    return v;
  }

  segmentsFor(fileName: string): Segment[] | undefined {
    return this.virtual(fileName)?.segments;
  }

  service(): TS.LanguageService {
    return this.ls;
  }

  toGen(fileName: string, pos: number): number {
    const segs = this.virtual(fileName)?.segments;
    return segs ? toGenerated(segs, pos) : -1;
  }

  toSrc(fileName: string, pos: number): number {
    const segs = this.virtual(fileName)?.segments;
    return segs ? toSource(segs, pos) : -1;
  }
}

function scriptKind(ts: typeof TS, fileName: string): TS.ScriptKind {
  if (fileName.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (fileName.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (fileName.endsWith('.js') || fileName.endsWith('.mjs') || fileName.endsWith('.cjs')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}
