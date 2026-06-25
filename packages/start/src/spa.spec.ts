import { describe, it, expect } from 'vitest';
import { resolveConfig } from './config.js';

describe('render mode (SPA vs SSR)', () => {
  it('defaults to SSR', () => {
    expect(resolveConfig({}).ssr).toBe(true);
  });

  it('ssr:false selects SPA — same app, client-rendered, still a full @fluixi/start server', () => {
    expect(resolveConfig({ ssr: false }).ssr).toBe(false);
  });
});
