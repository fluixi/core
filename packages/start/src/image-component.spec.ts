import { describe, expect, it } from 'vitest';
import { createComponent, renderToString } from '@fluixi/dom';
import { Img, type ImgProps } from './image.js';

const html = (props: ImgProps) => renderToString(() => createComponent(Img as never, props), { hydrationKeys: false });
const attr = (out: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(out)?.[1];

describe('Img', () => {
  it('a fixed width gets its 1x and 2x URLs, rounded up to widths the endpoint serves', () => {
    const out = html({ src: '/cat.jpg', alt: 'A cat', width: 300, height: 200 });
    expect(attr(out, 'srcset')).toBe('/api/image?url=%2Fcat.jpg&amp;w=384 1x, /api/image?url=%2Fcat.jpg&amp;w=640 2x');
    expect(attr(out, 'src')).toBe('/api/image?url=%2Fcat.jpg&amp;w=640');
    expect(attr(out, 'width')).toBe('300');
    expect(attr(out, 'height')).toBe('200');
    expect(attr(out, 'loading')).toBe('lazy');
    expect(attr(out, 'decoding')).toBe('async');
    expect(attr(out, 'alt')).toBe('A cat');
  });

  it('with sizes, lists every width', () => {
    const out = html({ src: '/cat.jpg', alt: '', sizes: '50vw', widths: [320, 640, 1280] });
    expect(attr(out, 'srcset')).toBe(
      '/api/image?url=%2Fcat.jpg&amp;w=320 320w, /api/image?url=%2Fcat.jpg&amp;w=640 640w, /api/image?url=%2Fcat.jpg&amp;w=1280 1280w',
    );
    expect(attr(out, 'sizes')).toBe('50vw');
  });

  it('priority loads at once and early', () => {
    const out = html({ src: '/hero.jpg', alt: '', width: 1200, priority: true });
    expect(attr(out, 'loading')).toBe('eager');
    expect(attr(out, 'fetchpriority')).toBe('high');
  });

  it('fill covers the parent, drawn at the viewport width by default', () => {
    const out = html({ src: '/bg.jpg', alt: '', fill: true });
    expect(attr(out, 'width')).toBeUndefined();
    expect(attr(out, 'sizes')).toBe('100vw');
    expect(attr(out, 'style')).toContain('position: absolute');
  });

  it('serves SVG and unoptimized sources as they are', () => {
    for (const props of [{ src: '/logo.svg', alt: '' }, { src: '/cat.jpg', alt: '', unoptimized: true }]) {
      const out = html(props);
      expect(attr(out, 'src')).toBe(props.src);
      expect(attr(out, 'srcset')).toBeUndefined();
    }
  });

  it('builds URLs with any loader and passes other attributes through', () => {
    const out = html({ src: 'cat.jpg', alt: '', width: 100, loader: ({ src, width }) => `https://cdn.test/${src}?w=${width}`, class: 'thumb' } as ImgProps);
    expect(attr(out, 'src')).toBe('https://cdn.test/cat.jpg?w=256');
    expect(attr(out, 'class')).toBe('thumb');
  });
});
