/**
 * @fileoverview File System Router Generator for KettleJS
 * @module @fluixi/kettlejs/router/fs-router
 *
 * Utilities to generate route definitions from file system structure
 * compatible with Vite's import.meta.glob.
 */

import { isPromise } from '@fluixi/dom';
import { lazy } from '../render/lazy.js';
import type { RouteDefinition } from './router.js';

/**
 * Configuration for file router
 */
export interface FileRouterOptions {
  /**
   * Root directory to strip from paths (default: '/src/pages')
   */
  root?: string;
  /**
   * Custom lazy loader wrapper
   */
  lazy?: (loader: () => Promise<any>) => any;
}

/**
 * Generate routes from import.meta.glob result
 *
 * @param modules Result of import.meta.glob
 * @param options Configuration options
 * @returns Array of RouteDefinitions
 *
 * @example
 * ```typescript
 * const routes = createFileRoutes(import.meta.glob('/src/pages/**\/*.tsx'));
 * ```
 */
export function createFileRoutes(
  modules: Record<string, () => Promise<any>>,
  options: FileRouterOptions = {}
): RouteDefinition[] {
  console.warn(
    '[KettleJS] createFileRoutes is deprecated. Use kettleRoutesPlugin from @fluixi/kettlejs/plugins instead.'
  );
  const root = options.root || '/src/routes';
  const routes: RouteDefinition[] = [];
  const layoutMap = new Map<string, RouteDefinition>();
  const routeMap = new Map<string, RouteDefinition>();

  // 1. Sort keys to ensure layouts process first, then specific paths
  const keys = Object.keys(modules).sort((a, b) => {
    // Layouts first
    const aIsLayout = a.includes('layout');
    const bIsLayout = b.includes('layout');
    if (aIsLayout && !bIsLayout) return -1;
    if (!aIsLayout && bIsLayout) return 1;
    return a.localeCompare(b);
  });

  // 2. Process each file
  for (const path of keys) {
    let cleanPath =
      path
        .replace(root, '')
        .replace(/\.(tsx|ts|js|jsx)$/, '')
        .replace(/\/index$/, '') || '/';

    // Handle dynamic params: [id] -> :id
    cleanPath = cleanPath.replace(/\[\.{3}([^\]]+)\]/g, '*$1'); // [...rest] -> *rest
    cleanPath = cleanPath.replace(/\[([^\]]+)\]/g, ':$1'); // [id] -> :id

    const loader = modules[path];
    const Component = options.lazy ? options.lazy(loader) : lazy(loader);
    const dataLoader = async (args: any) => {
      const mod = await loader();
      let res = mod.routeData ? mod.routeData(args) : undefined;
      if (isPromise(res)) {
        res = await res;
      }
      return res;
    };

    const isLayout = path.includes('layout');

    // Determine parent path
    const pathParts = cleanPath.split('/').filter(Boolean);
    const segment = pathParts.pop(); // last part is current segment
    const parentPath = '/' + pathParts.join('/'); // reconstruct parent path

    // Definition
    const def: RouteDefinition = {
      path: isLayout ? '' : segment || '/', // Layouts don't add to path segment usually unless grouping
      component: Component,
      data: dataLoader,
      // data: createResource((v: any) => dataLoader(v) as any)[0],
      children: [],
    };

    // If it's a layout, store it
    if (isLayout) {
      // Find parent layout
      // For /users/layout, parent is root layout or null
      // We map layout by directory path: /users/
      const dir = path.replace(/\/[^/]+$/, ''); // /src/pages/users
      const dirKey = dir.replace(root, '') || '/';

      layoutMap.set(dirKey, def);

      // If root layout, add to routes
      if (dirKey === '/' || dirKey === '') {
        routes.push(def);
      } else {
        // Find parent layout to attach to
        // /users/ -> parent is /
        const parentParts = dirKey.split('/').filter(Boolean);
        parentParts.pop();
        const parentDirKey = '/' + parentParts.join('/');

        const parentLayout = layoutMap.get(parentDirKey);
        if (parentLayout) {
          // Ensure children array exists
          if (!parentLayout.children) parentLayout.children = [];
          (parentLayout.children as RouteDefinition[]).push(def);
        } else {
          // Fallback if no parent layout found (should imply root)
          routes.push(def);
        }
      }
      continue;
    }

    // Normal Route
    // Find nearest layout
    // /users/detail -> looks for layout in /users/, then /

    let currentDir = cleanPath === '/' ? '/' : '/' + pathParts.join('/');
    if (cleanPath.endsWith('/')) currentDir = cleanPath.slice(0, -1);
    if (currentDir === '') currentDir = '/';

    // Try to find layout for this directory
    let parentLayout = layoutMap.get(currentDir);

    // If exact directory has no layout, try parent directories?
    // Actually, usually a route belongs to the layout of its directory OR parent directories.
    // If /users/index.tsx exists, and /users/layout.tsx exists, index belongs to layout.
    // If /users/detail.tsx exists, it belongs to /users/layout.tsx.

    // Recurse up to find a layout
    let layoutSearchPath = currentDir;
    while (!parentLayout && layoutSearchPath !== '/') {
      const parts = layoutSearchPath.split('/').filter(Boolean);
      parts.pop();
      layoutSearchPath = '/' + parts.join('/');
      parentLayout = layoutMap.get(layoutSearchPath);
    }
    // Check root layout if not found
    if (!parentLayout) parentLayout = layoutMap.get('/');

    if (parentLayout) {
      if (!parentLayout.children) parentLayout.children = [];
      // Adjust path to be relative to parent layout?
      // If layout is at /, and route is /users/detail, path is users/detail
      // If layout is at /users/, and route is /users/detail, path is detail

      // Calculate relative path
      // This is complex because we normalized full paths.
      // kettlejs router expects full paths or relative?
      // The router implementation uses `path.match(regex)`.
      // If nesting, children paths should be relative?
      // "const fullPath = basePath + route.path;" -> Yes, relative.

      // Let's assume layout path contributes to the URL?
      // Usually layout path is empty "" but it wraps children.
      // The route definition above set path: isLayout ? '' ...

      // If parent layout corresponds to /users/, its internal path might be "users" (relative to root).
      // We need to match up.

      // Simplifying:
      // 1. Filesystem routing implies full path matching usually, but nested layouts imply hierarchy.
      // 2. We'll attach to the found layout.
      // 3. The route path should be the FULL path for now, unless we properly subtract.

      // For this simple implementation, let's just push to root if no layout, or children if layout.
      // AND let's just use full paths for now, relying on the router to handle absolute paths in children?
      // The router logic: "const fullPath = basePath + route.path;"
      // So if parent is root (base=''), child is '/users', full='/users'.
      // If parent is '/users' (base='/users'), child should be 'detail' (full='/users/detail').

      // Fix path for nesting:
      // parentLayout.path (if it has one).
      // Actually, we stored full path concepts in layoutMap keys.
      // layoutSearchPath is the directory of the layout. e.g. /users

      let relativePath = cleanPath;
      if (layoutSearchPath !== '/' && cleanPath.startsWith(layoutSearchPath)) {
        relativePath = cleanPath.slice(layoutSearchPath.length);
        if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
      } else if (layoutSearchPath === '/') {
        if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
      }

      def.path = relativePath || '/'; // Index routes become / relative to parent

      (parentLayout.children as RouteDefinition[]).push(def);
    } else {
      // No layout found, add to root
      if (def.path.startsWith('/')) def.path = def.path.slice(1); // root routes
      if (def.path === '') def.path = '/';
      routes.push(def);
    }
  }

  return routes;
}
