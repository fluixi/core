// Bundlers replace `process.env.NODE_ENV`; declared here so a browser package needs no Node types.
declare const process: { env: { NODE_ENV?: string } };

/**
 * Whether this runs in development, when the build did not define `__DEV__`: `NODE_ENV`, written
 * out in full so a bundler replaces it, and treated as development where nothing defines it.
 */
export function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return true;
  }
}
