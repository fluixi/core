declare module '@vinxi/server-functions/plugin' {
  function createHandlerRouter(
    t: import('vinxi').HandlerRouterInput
  ): import('vinxi').HandlerRouterInput;
  const serverFunctions: {
    client: ({
      runtime,
      manifest,
    }?: {
      runtime?: string | undefined;
      manifest?: any;
    }) => any[];
    server: ({
      client,
      manifest,
      runtime,
    }?: {
      client?: string | undefined;
      manifest?: any;
      runtime?: string | undefined;
    }) => any[];
    router: ({
      runtime,
      ...overrides
    }?: {
      runtime?: string;
    } & Partial<import('vinxi').HandlerRouterInput>) => {};
  };
}

// types/vinxi.d.ts
declare module 'vinxi/fs-router' {
  export interface FileSystemRouterConfig {
    dir: string;
    extensions: string[];
  }

  export class BaseFileSystemRouter {
    constructor(config: FileSystemRouterConfig, router: any, app: any);
    toPath(src: string): string;
    toRoute(src: string): any;
  }

  export function cleanPath(path: string): string;
}

declare module 'vinxi/client' {
  // Common for client-side manifest imports
  export const manifest: any;
}
