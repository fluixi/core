// @vitest-environment jsdom
import { it, expect, vi } from 'vitest';
import { prepareRender } from '@fluixi/dom';

// The page renders before @fluixi/di is loaded, as when only a route's chunk imports it.
it('warns about an initializer registered after the page started rendering, though di loaded late', async () => {
  await prepareRender();
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const { provideRoot, provideAppInitializer } = await import('./index.js');
  provideRoot([provideAppInitializer(() => {})]);
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('registered after the app started rendering'));
});
