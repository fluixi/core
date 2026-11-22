// Bundlers replace `process.env.NODE_ENV`; declared here so a browser package needs no Node types.
declare const process: { env: { NODE_ENV?: string } };

/**
 * Whether this runs in development, when the build did not define `__DEV__`: `NODE_ENV`, written
 * out in full so a bundler replaces it, and treated as development where nothing defines it.
 */
let development: boolean | undefined;

/** Read once: checks on hot paths call it on every update while `__DEV__` is undefined. */
export function isDevelopment(): boolean {
  if (development === undefined) {
    try {
      development = process.env.NODE_ENV !== 'production';
    } catch {
      development = true;
    }
  }
  return development;
}
