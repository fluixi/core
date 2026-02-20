/**
 * @fileoverview Production builder for KettleJS applications
 * @module @awc/kettlejs/builder
 *
 * This module provides build utilities for creating optimized production bundles
 * of KettleJS applications using Vite/Rollup.
 */

import { build as viteBuild, UserConfig, BuildOptions, Plugin } from 'vite';
import { resolve } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Configuration options for the KettleJS builder
 */
export interface BuildConfig {
  /**
   * Root directory of the project
   * @default process.cwd()
   */
  root?: string;

  /**
   * Output directory for built files
   * @default 'dist'
   */
  outDir?: string;

  /**
   * Build mode
   * @default 'production'
   */
  mode?: 'development' | 'production';

  /**
   * Generate sourcemaps
   * @default false
   */
  sourcemap?: boolean | 'inline' | 'hidden';

  /**
   * Minify output
   * @default true
   */
  minify?: boolean | 'terser' | 'esbuild';

  /**
   * Target browsers
   * @default 'es2020'
   */
  target?: string | string[];

  /**
   * Base public path
   * @default '/'
   */
  base?: string;

  /**
   * Build for SSR
   * @default false
   */
  ssr?: boolean;

  /**
   * SSR entry point
   * @default 'src/entry-server.ts'
   */
  ssrEntry?: string;

  /**
   * Client entry point
   * @default 'src/main.ts'
   */
  entry?: string;

  /**
   * Enable code splitting
   * @default true
   */
  splitting?: boolean;

  /**
   * Custom Rollup options
   */
  rollupOptions?: BuildOptions['rollupOptions'];

  /**
   * Additional Vite configuration
   */
  vite?: UserConfig;

  /**
   * Enable bundle analysis
   * @default false
   */
  analyze?: boolean;

  /**
   * Clean output directory before build
   * @default true
   */
  clean?: boolean;

  /**
   * Emit declaration files for TypeScript
   * @default false
   */
  emitDeclarations?: boolean;
}

/**
 * Build result information
 */
export interface BuildResult {
  /**
   * Output directory
   */
  outDir: string;

  /**
   * List of generated files
   */
  files: string[];

  /**
   * Build duration in milliseconds
   */
  duration: number;

  /**
   * Total size in bytes
   */
  size: number;
}

/**
 * Creates a Vite plugin for KettleJS production builds
 *
 * @param {BuildConfig} config - Build configuration
 * @returns {Plugin} Vite plugin
 */
export function kettleJSBuildPlugin(config: BuildConfig = {}): Plugin {
  return {
    name: 'vite-plugin-kettlejs-build',

    config() {
      return {
        build: {
          target: config.target || 'es2020',
          modulePreload: {
            polyfill: true,
          },
        },
        optimizeDeps: {
          include: ['lit', '@awc/reactive', '@awc/kettlejs'],
        },
        resolve: {
          dedupe: ['lit'],
        },
      };
    },

    generateBundle(options, bundle) {
      // Add custom transformations or optimizations
      if (config.analyze) {
        const stats: any = {};
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (chunk.type === 'chunk') {
            stats[fileName] = {
              size: chunk.code.length,
              imports: chunk.imports,
              exports: chunk.exports,
            };
          }
        }
        console.log('\n=== Bundle Analysis ===');
        console.log(JSON.stringify(stats, null, 2));
      }
    },
  };
}

/**
 * Cleans the output directory
 *
 * @param {string} outDir - Directory to clean
 * @returns {Promise<void>}
 */
async function cleanOutDir(outDir: string): Promise<void> {
  if (existsSync(outDir)) {
    await fs.rm(outDir, { recursive: true, force: true });
    console.log(`Cleaned ${outDir}`);
  }
}

/**
 * Gets the size of all files in a directory
 *
 * @param {string} dir - Directory path
 * @returns {Promise<number>} Total size in bytes
 */
async function getDirectorySize(dir: string): Promise<number> {
  let size = 0;

  async function traverse(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = resolve(currentPath, entry.name);
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        size += stats.size;
      }
    }
  }

  await traverse(dir);
  return size;
}

/**
 * Lists all files in a directory recursively
 *
 * @param {string} dir - Directory path
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Promise<string[]>} Array of file paths
 */
async function listFiles(
  dir: string,
  baseDir: string = dir
): Promise<string[]> {
  const files: string[] = [];

  async function traverse(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = resolve(currentPath, entry.name);
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else {
        files.push(fullPath.replace(baseDir + '/', ''));
      }
    }
  }

  await traverse(dir);
  return files;
}

/**
 * Builds a KettleJS application for production
 *
 * @param {BuildConfig} config - Build configuration
 * @returns {Promise<BuildResult>} Build result information
 *
 * @example
 * ```typescript
 * import { build } from '@awc/kettlejs/builder';
 *
 * const result = await build({
 *   outDir: 'dist',
 *   minify: true,
 *   sourcemap: true
 * });
 *
 * console.log(`Built ${result.files.length} files in ${result.duration}ms`);
 * ```
 */
export async function build(config: BuildConfig = {}): Promise<BuildResult> {
  const startTime = Date.now();

  const {
    root = process.cwd(),
    outDir = 'dist',
    mode = 'production',
    sourcemap = false,
    minify = true,
    target = 'es2020',
    base = '/',
    ssr = false,
    ssrEntry = 'src/entry-server.ts',
    entry = 'src/main.ts',
    splitting = true,
    rollupOptions = {},
    vite = {},
    analyze: shouldAnalyze = false,
    clean = true,
    emitDeclarations = false,
  } = config;

  const outPath = resolve(root, outDir);

  // Clean output directory if requested
  if (clean) {
    await cleanOutDir(outPath);
  }

  // Log entry point being used
  console.log(`Building entry: ${entry}`);

  // Enable analysis if requested
  if (shouldAnalyze) {
    console.log('📊 Bundle analysis enabled');
  }

  // Build client bundle
  console.log('\n🔨 Building client bundle...\n');

  const clientConfig: UserConfig = {
    root,
    base,
    mode,
    build: {
      outDir: outPath,
      sourcemap,
      minify,
      target,
      emptyOutDir: false,
      rollupOptions: {
        input: resolve(root, 'index.html'),
        output: {
          manualChunks: splitting
            ? {
                lit: ['lit'],
                reactive: ['@awc/reactive'],
                kettlejs: ['@awc/kettlejs'],
              }
            : undefined,
        },
        ...rollupOptions,
      },
    },
    plugins: [kettleJSBuildPlugin(config), ...(vite.plugins || [])],
    ...vite,
  };

  await viteBuild(clientConfig);

  // Build SSR bundle if requested
  if (ssr) {
    console.log('\n🔨 Building SSR bundle...\n');

    const ssrConfig: UserConfig = {
      root,
      base,
      mode,
      build: {
        ssr: true,
        outDir: resolve(outPath, 'ssr'),
        sourcemap,
        minify,
        target: 'node16',
        rollupOptions: {
          input: resolve(root, ssrEntry),
          output: {
            format: 'esm',
            entryFileNames: '[name].js',
          },
        },
      },
      plugins: [kettleJSBuildPlugin(config), ...(vite.plugins || [])],
      ...vite,
    };

    await viteBuild(ssrConfig);
  }

  // Build TypeScript declarations if requested
  if (emitDeclarations) {
    console.log('\n📝 Generating TypeScript declarations...\n');
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      await execAsync('tsc --emitDeclarationOnly', { cwd: root });
      console.log('✓ Declarations generated\n');
    } catch (error) {
      console.warn('⚠️  Failed to generate declarations:', error);
    }
  }

  // Collect build results
  const duration = Date.now() - startTime;
  const files = await listFiles(outPath);
  const size = await getDirectorySize(outPath);

  console.log('\n✨ Build completed!\n');
  console.log(`  Output: ${outDir}`);
  console.log(`  Files: ${files.length}`);
  console.log(`  Size: ${(size / 1024).toFixed(2)} KB`);
  console.log(`  Duration: ${duration}ms\n`);

  return {
    outDir: outPath,
    files,
    duration,
    size,
  };
}

/**
 * Builds both client and SSR bundles
 *
 * @param {BuildConfig} config - Build configuration
 * @returns {Promise<BuildResult>} Build result
 *
 * @example
 * ```typescript
 * import { buildFullStack } from '@awc/kettlejs/builder';
 *
 * await buildFullStack({
 *   outDir: 'dist',
 *   ssrEntry: 'src/server.ts'
 * });
 * ```
 */
export async function buildFullStack(
  config: BuildConfig = {}
): Promise<BuildResult> {
  return build({ ...config, ssr: true });
}

/**
 * Builds only the client bundle
 *
 * @param {BuildConfig} config - Build configuration
 * @returns {Promise<BuildResult>} Build result
 *
 * @example
 * ```typescript
 * import { buildClient } from '@awc/kettlejs/builder';
 *
 * await buildClient({ minify: true });
 * ```
 */
export async function buildClient(
  config: BuildConfig = {}
): Promise<BuildResult> {
  return build({ ...config, ssr: false });
}

/**
 * Watches files and rebuilds on changes (development mode)
 *
 * @param {BuildConfig} config - Build configuration
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * import { watch } from '@awc/kettlejs/builder';
 *
 * await watch({ outDir: 'dist' });
 * ```
 */
export async function watch(config: BuildConfig = {}): Promise<void> {
  const { root = process.cwd(), outDir = 'dist', vite = {} } = config;

  console.log('\n👀 Watching for changes...\n');

  const watchConfig: UserConfig = {
    root,
    build: {
      outDir,
      watch: {},
    },
    plugins: [kettleJSBuildPlugin(config), ...(vite.plugins || [])],
    ...vite,
  };

  await viteBuild(watchConfig);
}

/**
 * Analyzes the bundle and outputs statistics
 *
 * @param {BuildConfig} config - Build configuration
 * @returns {Promise<any>} Bundle statistics
 *
 * @example
 * ```typescript
 * import { analyzeBundle } from '@awc/kettlejs/builder';
 *
 * const stats = await analyzeBundle({ outDir: 'dist' });
 * console.log('Bundle stats:', stats);
 * ```
 */
export async function analyzeBundle(config: BuildConfig = {}): Promise<any> {
  const result = await build({ ...config, analyze: true });

  const stats = {
    files: result.files.length,
    totalSize: result.size,
    averageSize: Math.round(result.size / result.files.length),
    duration: result.duration,
    sizeByType: {} as Record<string, number>,
  };

  // Analyze by file type
  result.files.forEach((file) => {
    const ext = file.split('.').pop() || 'unknown';
    stats.sizeByType[ext] = (stats.sizeByType[ext] || 0) + 1;
  });

  console.log('\n📊 Bundle Analysis:');
  console.log(`Total files: ${stats.files}`);
  console.log(`Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
  console.log(`Average file size: ${(stats.averageSize / 1024).toFixed(2)} KB`);
  console.log(`Build duration: ${stats.duration}ms`);
  console.log('Files by type:', stats.sizeByType);

  return stats;
}

/**
 * Optimizes assets in the build output
 *
 * @param {string} outDir - Output directory
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * import { optimizeAssets } from '@awc/kettlejs/builder';
 *
 * await build({ outDir: 'dist' });
 * await optimizeAssets('dist');
 * ```
 */
export async function optimizeAssets(outDir: string): Promise<void> {
  console.log('\n🎨 Optimizing assets...\n');

  const outPath = resolve(process.cwd(), outDir);
  const files = await listFiles(outPath);

  // Optimize images, CSS, etc.
  let optimizedCount = 0;

  for (const file of files) {
    const ext = file.split('.').pop()?.toLowerCase();

    if (ext === 'html') {
      // Minify HTML
      const filePath = resolve(outPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const minified = content
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
      await fs.writeFile(filePath, minified);
      optimizedCount++;
    }
  }

  console.log(`✓ Optimized ${optimizedCount} assets\n`);
}

/**
 * Default export with all utilities
 */
export default {
  build,
  buildClient,
  buildFullStack,
  watch,
  analyzeBundle,
  optimizeAssets,
  kettleJSBuildPlugin,
};
