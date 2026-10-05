/**
 * What a route's chunk imports, for the page that renders it.
 *
 * Vite's SSR manifest names only the files of the chunk a module lives in. A component that
 * several routes use goes to a chunk of its own, so its stylesheet was named nowhere: the
 * server-rendered page painted that component unstyled until hydration loaded the chunk. The
 * build manifest records each chunk's static imports and their CSS; following them closes that.
 */
export interface ManifestChunk {
  file: string;
  css?: string[];
  imports?: string[];
}

/**
 * `files` (as the SSR manifest writes them, with the base in front) with the chunks they import
 * and those chunks' stylesheets. Dependencies come first, the order Vite itself loads them in, so
 * a route's own CSS still follows what it builds on.
 */
export function withImports(files: string[], chunks: Record<string, ManifestChunk>): string[] {
  const byFile = new Map(Object.values(chunks).map((chunk) => [chunk.file, chunk] as const));
  const deps: string[] = [];
  const seen = new Set<string>();
  const visit = (chunk: ManifestChunk, base: string): void => {
    for (const key of chunk.imports ?? []) {
      const dep = chunks[key];
      if (!dep || seen.has(dep.file)) continue;
      seen.add(dep.file);
      visit(dep, base);
      deps.push(...(dep.css ?? []).map((css) => base + css), base + dep.file);
    }
  };
  for (const file of files) {
    for (const [name, chunk] of byFile) {
      if (!file.endsWith(name)) continue;
      seen.add(name);
      visit(chunk, file.slice(0, file.length - name.length));
    }
  }
  return [...new Set([...deps, ...files])];
}
