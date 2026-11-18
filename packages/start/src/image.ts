import { createDynamicElement, mergeProps, splitProps } from '@fluixi/dom';
import type { ImgHTMLAttributes } from '@fluixi/dom/attributes';
import { IMAGE_WIDTHS, imageLoader, type ImageLoaderOptions } from './image-loader.js';

export { IMAGE_WIDTHS, imageLoader, type ImageLoaderOptions };

/** Turns a source and a width into the URL of that image at that width. */
export type ImageLoader = (args: { src: string; width: number; quality?: number }) => string;

export interface ImgProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcset' | 'sizes' | 'loading' | 'width' | 'height' | 'style'> {
  src: string;
  alt: string;
  /** The image's own width in pixels: the browser reserves the space, and the 1x and 2x URLs are built from it. */
  width?: number;
  height?: number;
  /** How wide the image is drawn, as the `sizes` attribute: with it, `srcset` lists every width. */
  sizes?: string;
  /** Above the fold: loaded at once and early, instead of when it nears the viewport. */
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  quality?: number;
  /** The widths URLs are built for. Default `IMAGE_WIDTHS`, the endpoint's own list. */
  widths?: readonly number[];
  /** Default `imageLoader()`, the start endpoint at `/api/image`. */
  loader?: ImageLoader;
  /** Cover the positioned parent, with no width or height of its own. */
  fill?: boolean;
  /** The plain `src`, no `srcset`. SVG sources are always served this way. */
  unoptimized?: boolean;
  style?: string | Record<string, string | number>;
}

const FILL = { position: 'absolute', inset: '0', width: '100%', height: '100%' };
const defaultLoader = imageLoader();

/**
 * An `<img>` that loads the size it is drawn at, from the start image endpoint or any `loader`.
 * Unstyled and stateless: it renders the same markup on the server and in the browser.
 */
export function Img(props: ImgProps): HTMLImageElement {
  const [own, rest] = splitProps(props, [
    'src', 'width', 'height', 'sizes', 'priority', 'loading', 'quality', 'widths', 'loader', 'fill', 'unoptimized', 'style',
  ]);
  const plain = () => Boolean(own.unoptimized) || /\.svg([?#]|$)/i.test(own.src);
  const url = (width: number) => (own.loader ?? defaultLoader)({ src: own.src, width, quality: own.quality });
  const sizes = () => own.sizes ?? (own.fill ? '100vw' : undefined);
  // Drawn at a width the page decides: every width, described by its size. Drawn at a fixed
  // width: that width and twice it, by pixel density, each rounded up to one the endpoint serves.
  const candidates = (): { width: number; descriptor: string }[] => {
    const all = [...(own.widths ?? IMAGE_WIDTHS)].sort((a, b) => a - b);
    if (sizes() || !own.width) return all.map((width) => ({ width, descriptor: `${width}w` }));
    const up = (width: number) => all.find((w) => w >= width) ?? all[all.length - 1]!;
    const one = up(own.width);
    const two = up(own.width * 2);
    return one === two ? [{ width: one, descriptor: '1x' }] : [{ width: one, descriptor: '1x' }, { width: two, descriptor: '2x' }];
  };
  const style = () => {
    if (!own.fill) return own.style;
    if (typeof own.style === 'string') return `position:absolute;inset:0;width:100%;height:100%;${own.style}`;
    return { ...FILL, ...own.style };
  };
  // Accessors, so each attribute follows the props it is computed from.
  const computed: Record<string, unknown> = {
    src: () => (plain() ? own.src : url(candidates().at(-1)!.width)),
    srcset: () => (plain() ? undefined : candidates().map((c) => `${url(c.width)} ${c.descriptor}`).join(', ')),
    sizes: () => (plain() ? undefined : sizes()),
    width: () => (own.fill ? undefined : own.width),
    height: () => (own.fill ? undefined : own.height),
    loading: () => (own.priority ? 'eager' : own.loading ?? 'lazy'),
    fetchpriority: () => (own.priority ? 'high' : undefined),
    decoding: 'async',
    style,
  };
  return createDynamicElement('img', mergeProps(rest, computed)) as HTMLImageElement;
}
