/**
 * @fileoverview File-system route scanner
 * @module @awc/kettlejs/plugins/route-scanner
 *
 * Scans a routes directory and builds a route tree following SolidStart conventions.
 * Pure utility — no bundler dependency.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface ScannedRoute {
  /** Relative file path from routes dir: 'users/[id].tsx' */
  filePath: string;
  /** URL segment for this route: ':id', 'about', '' (index) */
  urlSegment: string;
  /** Full URL path: '/users/:id' */
  urlPath: string;
  /** Whether this is a layout file (layout.tsx) */
  isLayout: boolean;
  /** Whether this is an index file (index.tsx) */
  isIndex: boolean;
  /** Whether this has dynamic params ([id]) */
  isDynamic: boolean;
  /** Whether this is a catch-all ([...rest]) */
  isCatchAll: boolean;
  /** Whether the parent directory is a route group ((name)) */
  isGroup: boolean;
  /** Nested child routes */
  children: ScannedRoute[];
  parentUrlPath: string;
  /** Whether this route file exports a `routeData` function */
  hasRouteData: boolean;
}

export interface ScanOptions {
  /** File extensions to include */
  extensions?: string[];
}

const DEFAULT_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// ============================================================================
// SCANNING
// ============================================================================

/**
 * Scan a routes directory and return a tree of ScannedRoute nodes.
 */
export function scanRoutes(
  routesDir: string,
  options: ScanOptions = {}
): ScannedRoute[] {
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  const absDir = path.resolve(routesDir);

  if (!fs.existsSync(absDir)) {
    return [];
  }

  return scanDirectory(absDir, absDir, '', extensions);
}

function scanDirectory(
  dir: string,
  rootDir: string,
  parentUrlPath: string,
  extensions: string[]
): ScannedRoute[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const routes: ScannedRoute[] = [];
  const layoutRoute: ScannedRoute | null = null;

  // Separate files and directories
  const files: fs.Dirent[] = [];
  const dirs: fs.Dirent[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      dirs.push(entry);
    } else if (entry.isFile() && hasValidExtension(entry.name, extensions)) {
      files.push(entry);
    }
  }

  // Find layout file first
  let layout: ScannedRoute | undefined;
  const nonLayoutFiles: fs.Dirent[] = [];

  for (const file of files) {
    const baseName = stripExtension(file.name);
    if (baseName === 'layout') {
      layout = buildFileRoute(file.name, dir, rootDir, parentUrlPath, true);
    } else {
      nonLayoutFiles.push(file);
    }
  }

  // Build routes for non-layout files
  const fileRoutes: ScannedRoute[] = [];
  for (const file of nonLayoutFiles) {
    fileRoutes.push(
      buildFileRoute(file.name, dir, rootDir, parentUrlPath, false)
    );
  }

  // Build routes for subdirectories
  const dirRoutes: ScannedRoute[] = [];
  for (const d of dirs) {
    const dirName = d.name;
    const isGroup = isRouteGroup(dirName);
    const segment = isGroup ? '' : dirNameToSegment(dirName);
    const childUrlPath = segment
      ? joinUrlPath(parentUrlPath, segment)
      : parentUrlPath;

    const children = scanDirectory(
      path.join(dir, dirName),
      rootDir,
      childUrlPath,
      extensions
    );

    if (isGroup) {
      // Route groups: children are flattened to parent level
      dirRoutes.push(...children);
    } else {
      // Regular directory: becomes a nested route
      // If there's a layout in the children, it becomes the parent route
      const childLayout = children.find((c) => c.isLayout);
      const childNonLayout = children.filter((c) => !c.isLayout);

      if (childLayout) {
        // Preserve children from recursive scan, add any non-layout siblings
        childLayout.children = [...childLayout.children, ...childNonLayout];
        dirRoutes.push(childLayout);
      } else if (childNonLayout.length > 0) {
        // No layout — just add children with their full paths
        dirRoutes.push(...childNonLayout);
      }
    }
  }

  // Combine: if there's a layout at this level, nest everything under it
  if (layout) {
    layout.children = [...fileRoutes, ...dirRoutes];
    routes.push(layout);
  } else {
    routes.push(...fileRoutes, ...dirRoutes);
  }

  // Sort: static routes first, then dynamic, then catch-all
  return sortRoutes(routes);
}

// ============================================================================
// ROUTE BUILDING
// ============================================================================

function buildFileRoute(
  fileName: string,
  dir: string,
  rootDir: string,
  parentUrlPath: string,
  isLayout: boolean
): ScannedRoute {
  const baseName = stripExtension(fileName);
  const filePath = path.relative(rootDir, path.join(dir, fileName));
  const isIndex = baseName === 'index';
  const isCatchAll = baseName.startsWith('[...');
  const isDynamic = !isCatchAll && baseName.startsWith('[') && baseName.endsWith(']');

  let urlSegment: string;
  if (isLayout) {
    urlSegment = '';
  } else if (isIndex) {
    urlSegment = '/';
  } else if (isCatchAll) {
    // [...rest] → *rest
    const paramName = baseName.slice(4, -1); // remove '[...' and ']'
    urlSegment = `*${paramName}`;
  } else if (isDynamic) {
    // [id] → :id
    const paramName = baseName.slice(1, -1); // remove '[' and ']'
    urlSegment = `:${paramName}`;
  } else {
    urlSegment = baseName;
  }

  const urlPath = isLayout
    ? parentUrlPath || '/'
    : isIndex
      ? parentUrlPath || '/'
      : joinUrlPath(parentUrlPath, urlSegment);

  // Detect if the file exports a `routeData` function (static analysis at scan time)
  const absoluteFilePath = path.join(dir, fileName);
  let hasRouteData = false;
  try {
    const content = fs.readFileSync(absoluteFilePath, 'utf-8');
    hasRouteData = /export\s+(const|function|async\s+function)\s+routeData\b/.test(content);
  } catch {
    // If file can't be read, assume no routeData
  }

  return {
    filePath: filePath.replace(/\\/g, '/'), // normalize to forward slashes
    urlSegment,
    urlPath,
    isLayout,
    isIndex,
    isDynamic,
    isCatchAll,
    isGroup: false,
    children: [],
    parentUrlPath,
    hasRouteData,
    rootDir,
    dir
  } as any;
}

// ============================================================================
// UTILITIES
// ============================================================================

function hasValidExtension(fileName: string, extensions: string[]): boolean {
  return extensions.some((ext) => fileName.endsWith(ext));
}

function stripExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

function isRouteGroup(dirName: string): boolean {
  return dirName.startsWith('(') && dirName.endsWith(')');
}

/** Convert a directory name to its URL segment, matching the same rules as file names. */
function dirNameToSegment(dirName: string): string {
  if (dirName.startsWith('[...') && dirName.endsWith(']')) {
    return '*' + dirName.slice(4, -1); // [...rest] → *rest
  }
  if (dirName.startsWith('[') && dirName.endsWith(']')) {
    return ':' + dirName.slice(1, -1); // [id] → :id
  }
  return dirName;
}

function joinUrlPath(parent: string, segment: string): string {
  const base = parent.endsWith('/') ? parent : parent + '/';
  return base + segment;
}

/**
 * Sort routes by specificity: static > dynamic > catch-all.
 * Index routes come before non-index at the same level.
 */
function sortRoutes(routes: ScannedRoute[]): ScannedRoute[] {
  return routes.sort((a, b) => {
    // Layouts first (they wrap children)
    if (a.isLayout && !b.isLayout) return -1;
    if (!a.isLayout && b.isLayout) return 1;

    // Index routes before others
    if (a.isIndex && !b.isIndex) return -1;
    if (!a.isIndex && b.isIndex) return 1;

    // Static before dynamic
    if (!a.isDynamic && !a.isCatchAll && (b.isDynamic || b.isCatchAll)) return -1;
    if ((a.isDynamic || a.isCatchAll) && !b.isDynamic && !b.isCatchAll) return 1;

    // Dynamic before catch-all
    if (a.isDynamic && b.isCatchAll) return -1;
    if (a.isCatchAll && b.isDynamic) return 1;

    // Alphabetical fallback
    return a.urlSegment.localeCompare(b.urlSegment);
  });
}
