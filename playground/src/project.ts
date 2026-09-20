// A playground project is a set of files, not a snippet. Everything the editor and the
// linker need about "what is open" lives here, so persistence and the file tree agree.

export interface ProjectFile {
  path: string;
  code: string;
}

export interface Project {
  name: string;
  entry: string;
  files: ProjectFile[];
}

export const ENTRY_CANDIDATES = ['src/main.tsx', 'src/main.ts', 'main.tsx', 'main.ts', 'index.tsx', 'index.ts'];

export const HTML_SHELL = 'index.html';

/**
 * The entry a project actually boots from, taken where possible from its index.html, that
 * is where a real app declares it, and the playground should not keep a second opinion.
 */
export function entryFromHtml(html: string): string | null {
  const match = /<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i.exec(html);
  if (!match) return null;
  return normalizePath(match[1]);
}

/** The markup a preview starts from: the body of index.html, minus its scripts. */
export function shellOf(html: string): string {
  const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const inner = body ? body[1] : html;
  return inner.replace(/<script[\s\S]*?<\/script>/gi, '').trim();
}

export function normalizePath(input: string): string {
  const trimmed = input.trim().replace(/^\.\//, '').replace(/^\/+/, '');
  if (!trimmed) return '';
  return trimmed.replace(/\\/g, '/');
}

/** A path is usable if it is non-empty, has a supported extension, and is not taken. */
export function validatePath(path: string, files: ProjectFile[], ignore?: string): string | null {
  const p = normalizePath(path);
  if (!p) return 'A file needs a name.';
  if (!/\.(tsx?|jsx?|css|json)$/.test(p)) return 'Use a .ts, .tsx, .js, .jsx, .css or .json extension.';
  if (/(^|\/)\.\.(\/|$)/.test(p)) return 'A path cannot climb out of the project.';
  if (files.some((f) => f.path === p && f.path !== ignore)) return `${p} already exists.`;
  return null;
}

export function findEntry(files: ProjectFile[], preferred?: string): string {
  const html = files.find((f) => f.path === HTML_SHELL);
  if (html) {
    const declared = entryFromHtml(html.code);
    if (declared && files.some((f) => f.path === declared)) return declared;
  }
  if (preferred && files.some((f) => f.path === preferred)) return preferred;
  for (const candidate of ENTRY_CANDIDATES) {
    if (files.some((f) => f.path === candidate)) return candidate;
  }
  const first = files.find((f) => /\.(tsx?|jsx?)$/.test(f.path));
  return first?.path ?? files[0]?.path ?? '';
}

const STORAGE_KEY = 'fluixi-playground-project';

export function saveProject(project: Project): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch {
    // Private mode or a full quota: the session still works, it just will not survive a reload.
  }
}

export function loadSavedProject(): Project | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Project;
    if (!parsed?.files?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

/**
 * Projects travel in the URL fragment so a link carries the code with it, no server, and
 * nothing to expire. Encoded through UTF-8 before base64, or any non-ASCII character in the
 * source throws.
 */
export function encodeProject(project: Project): string {
  const json = JSON.stringify(project);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeProject(hash: string): Project | null {
  try {
    const base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Project;
    if (!parsed?.files?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}
