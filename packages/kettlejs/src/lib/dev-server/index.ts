/**
 * @fileoverview Development server for KettleJS applications
 * @module @fluixi/kettlejs/dev-server
 *
 * This module provides a Vite-based development server with Hot Module Replacement (HMR)
 * and optimized for KettleJS applications.
 */

import { createServer, ViteDevServer, UserConfig, Plugin } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

/**
 * Configuration options for the KettleJS dev server
 */
export interface DevServerConfig {
  /**
   * Root directory of the project
   * @default process.cwd()
   */
  root?: string;

  /**
   * Port to run the dev server on
   * @default 3000
   */
  port?: number;

  /**
   * Host to bind the dev server to
   * @default 'localhost'
   */
  host?: string | boolean;

  /**
   * Enable HTTPS
   * @default false
   */
  https?: boolean;

  /**
   * Open browser on server start
   * @default false
   */
  open?: boolean;

  /**
   * Base public path
   * @default '/'
   */
  base?: string;

  /**
   * Additional Vite configuration
   */
  vite?: UserConfig;

  /**
   * Enable SSR mode
   * @default false
   */
  ssr?: boolean;

  /**
   * Custom HTML template path
   */
  template?: string;
}

/**
 * Default HTML template for development
 */
const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KettleJS Dev</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`;

/**
 * Creates a Vite plugin for KettleJS development
 *
 * @returns {Plugin} Vite plugin
 */
export function kettleJSPlugin(): Plugin {
  return {
    name: 'vite-plugin-kettlejs',

    config() {
      return {
        optimizeDeps: {
          include: ['lit', '@fluixi/reactive', '@fluixi/kettlejs'],
          exclude: [],
        },
        build: {
          target: 'es2020',
          rollupOptions: {
            output: {
              manualChunks: {
                lit: ['lit'],
                reactive: ['@fluixi/reactive'],
              },
            },
          },
        },
        resolve: {
          dedupe: ['lit'],
        },
      };
    },

    configureServer(server) {
      // Add custom middleware for KettleJS specific handling
      server.middlewares.use((req, res, next) => {
        // Handle custom routes or transformations
        next();
      });
    },

    transformIndexHtml(html) {
      // Add KettleJS specific meta tags or scripts
      return html.replace(
        '</head>',
        `  <meta name="generator" content="KettleJS">
  </head>`
      );
    },

    handleHotUpdate({ file, server }) {
      // Custom HMR handling for KettleJS components
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        // Reload modules that use signals
        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
      }
    },
  };
}

/**
 * Creates and starts a development server for KettleJS applications
 *
 * @param {DevServerConfig} config - Development server configuration
 * @returns {Promise<ViteDevServer>} The running Vite dev server instance
 *
 * @example
 * ```typescript
 * import { createDevServer } from '@fluixi/kettlejs/dev-server';
 *
 * const server = await createDevServer({
 *   port: 3000,
 *   open: true
 * });
 *
 * console.log(`Server running at ${server.resolvedUrls?.local[0]}`);
 * ```
 */
export async function createDevServer(
  config: DevServerConfig = {}
): Promise<ViteDevServer> {
  const {
    root = process.cwd(),
    port = 3000,
    host = 'localhost',
    https = false,
    open = false,
    base = '/',
    vite = {},
    template,
  } = config;

  // Ensure index.html exists
  const indexHtmlPath = resolve(root, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    const htmlContent = template
      ? fs.readFileSync(template, 'utf-8')
      : DEFAULT_HTML_TEMPLATE;
    fs.writeFileSync(indexHtmlPath, htmlContent);
    console.log('Created index.html');
  }

  // Create Vite configuration
  const viteConfig: UserConfig = {
    root,
    base,
    server: {
      port,
      host: typeof host === 'boolean' ? (host ? '0.0.0.0' : 'localhost') : host,
      https: https ? {} : undefined,
      open,
      strictPort: false,
      cors: true,
      hmr: {
        overlay: true,
      },
    },
    plugins: [kettleJSPlugin(), ...(vite.plugins || [])],
    ...vite,
  };

  // Create and start the server
  const server = await createServer(viteConfig);
  await server.listen();

  // Log server information
  server.printUrls();
  console.log('\n  KettleJS dev server ready!\n');

  return server;
}

/**
 * Starts a dev server with simplified API
 *
 * @param {number} port - Port to run on (default: 3000)
 * @param {boolean} open - Open browser (default: false)
 * @returns {Promise<ViteDevServer>} The running server
 *
 * @example
 * ```typescript
 * import { startDevServer } from '@fluixi/kettlejs/dev-server';
 *
 * await startDevServer(3000, true);
 * ```
 */
export async function startDevServer(
  port: number = 3000,
  open: boolean = false
): Promise<ViteDevServer> {
  return createDevServer({ port, open });
}

/**
 * Stops a running dev server
 *
 * @param {ViteDevServer} server - Server instance to stop
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * import { createDevServer, stopDevServer } from '@fluixi/kettlejs/dev-server';
 *
 * const server = await createDevServer();
 * // ... later
 * await stopDevServer(server);
 * ```
 */
export async function stopDevServer(server: ViteDevServer): Promise<void> {
  await server.close();
  console.log('Dev server stopped');
}

/**
 * Creates a middleware for SSR development
 *
 * @param {DevServerConfig} config - Server configuration
 * @returns {Promise<any>} Express-like middleware
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createSSRMiddleware } from '@fluixi/kettlejs/dev-server';
 *
 * const app = express();
 * const ssrMiddleware = await createSSRMiddleware({ root: './src' });
 * app.use(ssrMiddleware);
 * ```
 */
export async function createSSRMiddleware(
  config: DevServerConfig = {}
): Promise<any> {
  const { root = process.cwd(), vite = {} } = config;

  const viteConfig: UserConfig = {
    root,
    appType: 'custom',
    server: {
      middlewareMode: true,
    },
    plugins: [kettleJSPlugin(), ...(vite.plugins || [])],
    ...vite,
  };

  const server = await createServer(viteConfig);

  return async (req: any, res: any, next: any) => {
    try {
      // Serve static files
      if (req.url.startsWith('/src/') || req.url.startsWith('/node_modules/')) {
        return next();
      }

      // Handle SSR
      const url = req.originalUrl;

      // Transform and load the entry file
      const { renderToString } = await server.ssrLoadModule(
        '/src/entry-server.ts'
      );

      // Render the app
      const appHtml = await renderToString(url);

      // Read and transform the HTML template
      let template = fs.readFileSync(resolve(root, 'index.html'), 'utf-8');
      template = await server.transformIndexHtml(url, template);

      // Inject the app HTML
      const html = template.replace('<!--app-html-->', appHtml);

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e: any) {
      // Log error for debugging
      console.error(e.stack);
      next(e);
    }
  };
}

/**
 * Configuration for preview server (production preview)
 */
export interface PreviewServerConfig {
  /**
   * Root directory
   */
  root?: string;

  /**
   * Port to run on
   * @default 4173
   */
  port?: number;

  /**
   * Host to bind to
   */
  host?: string | boolean;

  /**
   * Open browser
   * @default false
   */
  open?: boolean;

  /**
   * Build output directory
   * @default 'dist'
   */
  outDir?: string;
}

/**
 * Creates a preview server to test production builds locally
 *
 * @param {PreviewServerConfig} config - Preview server configuration
 * @returns {Promise<any>} The preview server
 *
 * @example
 * ```typescript
 * import { createPreviewServer } from '@fluixi/kettlejs/dev-server';
 *
 * const server = await createPreviewServer({
 *   port: 4173,
 *   open: true
 * });
 * ```
 */
export async function createPreviewServer(
  config: PreviewServerConfig = {}
): Promise<any> {
  const { preview } = await import('vite');

  const {
    root = process.cwd(),
    port = 4173,
    host = 'localhost',
    open = false,
    outDir = 'dist',
  } = config;

  const server = await preview({
    root,
    preview: {
      port,
      host,
      open,
    },
    build: {
      outDir,
    },
  });

  server.printUrls();
  console.log('\n  KettleJS preview server ready!\n');

  return server;
}

/**
 * Default export with all utilities
 */
export default {
  createDevServer,
  startDevServer,
  stopDevServer,
  createSSRMiddleware,
  createPreviewServer,
  kettleJSPlugin,
};
