declare const __DEV__: boolean | undefined;

/**
 * Whether this is a development build. The published production build defines `__DEV__` as
 * `false`, so a bundler folds `if (DEV)` away and the code behind it never ships; the
 * development build and the monorepo's source leave it true.
 */
export const DEV: boolean = typeof __DEV__ === 'undefined' || __DEV__;
