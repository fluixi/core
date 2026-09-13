// The file list as a tree.
//
// A project is a flat list of paths — `src/app.tsx`, `src/ui/Button.tsx` — which is what the
// linker and the compiler want. A sidebar showing them that way makes a project of any size
// unreadable, so the same list is folded into folders here and flattened back into rows the
// list renders, each carrying how deep it is.
//
// Folders are implied by the paths: there is no such thing as an empty one, and nothing to
// create. Naming a file `src/ui/Button.tsx` is how a folder comes into being.
import type { ProjectFile } from './project';

export interface TreeRow {
  kind: 'folder' | 'file';
  /** Full path for a file; the folder's path for a folder. */
  path: string;
  /** The last segment — what the row shows. */
  name: string;
  depth: number;
  /** Folders only. */
  open?: boolean;
}

interface Node {
  name: string;
  path: string;
  children: Map<string, Node>;
  file?: ProjectFile;
}

/** Folders first, then files, each alphabetically — the order an editor shows. */
function ordered(nodes: Iterable<Node>): Node[] {
  return [...nodes].sort((a, b) => {
    const aFolder = a.children.size > 0;
    const bFolder = b.children.size > 0;
    if (aFolder !== bFolder) return aFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Rows for the sidebar. `collapsed` holds the folders that are shut; everything under one is
 * left out rather than hidden with a class, so the list stays as short as it looks.
 */
export function tree(files: ProjectFile[], collapsed: ReadonlySet<string>): TreeRow[] {
  const root: Node = { name: '', path: '', children: new Map() };

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean);
    let at = root;
    segments.forEach((segment, i) => {
      const path = segments.slice(0, i + 1).join('/');
      let next = at.children.get(segment);
      if (!next) at.children.set(segment, (next = { name: segment, path, children: new Map() }));
      if (i === segments.length - 1) next.file = file;
      at = next;
    });
  }

  const rows: TreeRow[] = [];
  const walk = (node: Node, depth: number): void => {
    for (const child of ordered(node.children.values())) {
      if (child.file && child.children.size === 0) {
        rows.push({ kind: 'file', path: child.path, name: child.name, depth });
        continue;
      }
      const open = !collapsed.has(child.path);
      rows.push({ kind: 'folder', path: child.path, name: child.name, depth, open });
      if (open) walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return rows;
}

/** Every folder a project has, for opening them all on load. */
export function foldersOf(files: ProjectFile[]): string[] {
  const out = new Set<string>();
  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean);
    for (let i = 0; i < segments.length - 1; i++) out.add(segments.slice(0, i + 1).join('/'));
  }
  return [...out];
}
