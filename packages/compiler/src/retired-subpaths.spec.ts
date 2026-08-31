import { describe, it, expect } from 'vitest';
import { createVitePlugin } from './integrations.js';

type Plugin = { resolveId(id: string, importer?: string): unknown };

const plugin = () => createVitePlugin<Plugin>({});

describe('a subpath that was retired', () => {
  it('names the replacement and the file that asked', () => {
    expect(() => plugin().resolveId('@fluixi/core/router-next', '/app/src/routes.tsx')).toThrow(
      /@fluixi\/core\/router-next is now @fluixi\/core\/router/,
    );
    expect(() => plugin().resolveId('@fluixi/core/router-next', '/app/src/routes.tsx')).toThrow(
      /imported by \/app\/src\/routes\.tsx/,
    );
  });

  it('says where the rx primitives went', () => {
    expect(() => plugin().resolveId('@fluixi/core/rx')).toThrow(/@fluixi\/reactive/);
  });

  it('leaves every other specifier alone', () => {
    expect(plugin().resolveId('@fluixi/core/router', '/app/src/routes.tsx')).toBe(null);
    expect(plugin().resolveId('@fluixi/dom')).toBe(null);
    expect(plugin().resolveId('./local.js')).toBe(null);
  });
});
