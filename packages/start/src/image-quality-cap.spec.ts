/** A request's `q` is capped at the configured quality, not only at 100. */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createImageHandler } from './image.js';

describe('image quality', () => {
  it('never exceeds the configured quality', async () => {
    const root = mkdtempSync(join(tmpdir(), 'fx-img-'));
    writeFileSync(join(root, 'a.png'), new Uint8Array([137, 80, 78, 71]));
    const seen: number[] = [];
    const handler = createImageHandler({
      root,
      quality: 60,
      transform: async (input, { quality }) => (seen.push(quality), { data: input, contentType: 'image/png' }),
    });
    for (const q of [100, 30]) await handler(new Request(`http://x/_image?url=/a.png&w=640&q=${q}`));
    expect(seen).toEqual([60, 30]);
  });
});
