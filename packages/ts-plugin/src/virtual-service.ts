/**
 * The virtual language service: a second `ts.LanguageService` that sees the
 * VIRTUAL text (templates turned into typed helper calls by `buildVirtual`) for
 * every file, and delegates everything else to the real host. The plugin routes
 * hover / completion / diagnostics through it, mapping positions with the
 * per-file {@link Segment} map so results land back on the real template.
 */
import type * as TS from 'typescript';
import { buildVirtual, toGenerated, toSource, inHole, type Segment } from './virtual.js';

export class VirtualService {
  private ls: TS.LanguageService;
  /** Cached per file: the virtual text + segments, keyed by the file's version. */
  private cache = new Map<string, { version: string; text: string; segments: Segment[] }>();

  constructor(private ts: typeof TS, private host: TS.LanguageServiceHost) {
    const self = this;
    // Delegate EVERYTHING to the real host (methods may live on its prototype in
    // the real tsserver, which a shallow spread would miss), overriding only the
    // snapshot so the second service sees the virtual text.
    const virtualHost = new Proxy(host, {
      get(target, prop, receiver) {
        if (prop === 'getScriptSnapshot') {
          return (fileName: string) => {
            const v = self.virtual(fileName);
            return v ? self.ts.ScriptSnapshot.fromString(v.text) : target.getScriptSnapshot(fileName);
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }) as TS.LanguageServiceHost;

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

  /** True when a SOURCE position lies inside an embedded `${…}` hole. */
  inHole(fileName: string, pos: number): boolean {
    const segs = this.virtual(fileName)?.segments;
    return segs ? inHole(segs, pos) : false;
  }
}

function scriptKind(ts: typeof TS, fileName: string): TS.ScriptKind {
  if (fileName.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (fileName.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (fileName.endsWith('.js') || fileName.endsWith('.mjs') || fileName.endsWith('.cjs')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}
