import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dedupeVitePlugin } from './dedupe-plugin.js';

describe('dedupeVitePlugin', () => {
  it('dedupes the framework packages the app can resolve, found in its node_modules or a parent', () => {
    const top = mkdtempSync(join(tmpdir(), 'fx-dedupe-'));
    const app = join(top, 'apps', 'web');
    mkdirSync(join(app, 'node_modules', '@fluixi', 'core'), { recursive: true });
    mkdirSync(join(top, 'node_modules', '@fluixi', 'reactive'), { recursive: true });
    const config = dedupeVitePlugin(app).config() as { resolve: { dedupe: string[] } };
    expect(config.resolve.dedupe).toEqual(['@fluixi/core', '@fluixi/reactive']);
  });

  it("adds the app's own packages that hold a context, when the app can resolve them", () => {
    const app = mkdtempSync(join(tmpdir(), 'fx-dedupe-'));
    mkdirSync(join(app, 'node_modules', '@fluixi', 'core'), { recursive: true });
    mkdirSync(join(app, 'node_modules', '@acme', 'theme'), { recursive: true });
    const config = dedupeVitePlugin(app, ['@acme/theme', '@acme/missing']).config() as { resolve: { dedupe: string[] } };
    expect(config.resolve.dedupe).toEqual(['@fluixi/core', '@acme/theme']);
  });
});
