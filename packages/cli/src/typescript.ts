/**
 * TypeScript with its compiler API. The app's own when it has one, so the version the project
 * compiles with is the one the rules run on. TypeScript 7 ships only the compiler: no program, no
 * type checker to call. For an app on it, the CLI's own classic TypeScript answers instead.
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type * as TS from 'typescript';

const hasApi = (ts: unknown): ts is typeof TS =>
  typeof (ts as { createProgram?: unknown } | null)?.createProgram === 'function';

export function typescriptApi(root: string, own: () => unknown = () => createRequire(import.meta.url)('typescript-api')): typeof TS {
  let app: unknown;
  try {
    app = createRequire(join(root, 'package.json'))('typescript');
  } catch {
    // No TypeScript in the app: nothing it compiles with to match, the CLI's own will do.
  }
  if (hasApi(app)) return app;
  const fallback = own();
  if (hasApi(fallback)) return fallback;
  throw new Error('fluixi check needs TypeScript in the app: npm install -D typescript');
}
