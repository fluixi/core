/**
 * The widths the image endpoint serves by default, and the ones `Img` builds its `srcset` from:
 * one list, so a URL the component writes is one the endpoint accepts.
 */
export const IMAGE_WIDTHS: readonly number[] = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

/**
 * The client half of the image support.
 *
 * `imageLoader` builds a URL; `createImageHandler` reads files and transforms them. Only
 * the first belongs in a page, so it lives apart from the half that imports `node:fs`.
 */
export interface ImageLoaderOptions {
  /** Path the image handler route is mounted at. Default `/api/image`. */
  path?: string;
}

/**
 * A loader for `@fluixi-ui/image` that targets a `createImageHandler` route.
 *
 * ```tsx
 * import { imageLoader } from '@fluixi/start';
 * const loader = imageLoader({ path: '/api/image' });
 * <Image src="/mug.jpg" loader={loader} widths={[120, 240, 480]} />
 * ```
 */
export function imageLoader(
  options: ImageLoaderOptions = {},
): (args: { src: string; width: number; quality?: number }) => string {
  const path = options.path ?? '/api/image';
  return ({ src, width, quality }) => {
    const params = new URLSearchParams({ url: src, w: String(width) });
    if (quality != null) params.set('q', String(quality));
    return `${path}?${params.toString()}`;
  };
}
