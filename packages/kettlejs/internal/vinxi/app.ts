// internal/vinxi/app.ts
// @ts-ignore
import { createApp as createVinxiApp } from 'vinxi';
import { serverFunctions } from '@vinxi/server-functions/plugin';
import path from 'path';
import { createVitePlugin } from '@awc/kettlejs/plugins';
import { BaseFileSystemRouter, cleanPath } from 'vinxi/fs-router';
import { fileURLToPath } from 'url';
import { cwd } from 'process';

console.log('vixen app definition');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class FileRouter extends BaseFileSystemRouter {
  constructor(config: any, router: any, app: any) {
    console.log('contructor', { config, router, app });
    super(config, router, app);
  }
  override toPath(src: any): string {
    console.log('router file', src);
    const path = cleanPath(src)
      .slice(1)
      .replace('index', '')
      .replace(/\[([^\/]+)\]/g, (_, m) => {
        if (m.length > 3 && m.startsWith('...')) {
          return `*${m.slice(3)}`;
        }
        return `:${m}`;
      });

    return `/${path}`;
  }

  override toRoute(src: any) {
    const path = this.toPath(src);

    return {
      $component: {
        src,
        pick: ['default'],
      },
      path,
      filePath: src,
    };
  }
}
export const createApp = createVinxiApp({
  root: process.cwd(),
  devtools: true,
  routers: [
    {
      name: 'client',
      type: 'client',
      // handler: path.resolve(__dirname, '../vinxi/entry-client.js'),
      handler: path.join(cwd(), 'entry-client.tsx'),
      target: 'browser',
      base: '/_build',
      routes: (router: any, app: any) => {
        console.log('routes', router, app);
        return new FileRouter(
          {
            dir: path.join(cwd(), 'src/routes'),
            extensions: ['jsx', 'js', 'tsx', 'ts'],
          },
          router,
          app
        );
      },
      plugins: () => [createVitePlugin(), serverFunctions.client()],
    } as any,
    {
      name: 'server',
      type: 'http',
      target: 'server',
      handler: path.resolve(__dirname, '../vinxi/entry-server.js'),
      routes: (router: any, app: any) => {
        console.log('routes', router, app);
        return new FileRouter(
          {
            dir: path.join(cwd(), 'src/routes'),
            extensions: ['jsx', 'js', 'tsx', 'ts'],
          },
          router,
          app
        );
      },
      // plugins: () => [createVitePlugin()],
    },
    {
      name: 'spa',
      type: 'spa',
      handler: path.resolve(__dirname, '../vinxi/entry-client.js'),
      plugins: () => [createVitePlugin()],
    },
    serverFunctions.router(),
  ],
});

export default createApp;
