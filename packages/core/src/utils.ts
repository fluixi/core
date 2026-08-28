/**
 * The `@fluixi/utils` surface, re-exported for convenience.
 *
 * A separate entry point on purpose: re-exporting it from the main `fluixi` barrel
 * dragged the entire library into every app, whether or not a single helper was used.
 * Importing it here is opt-in, so only apps that want it pay for it — and prefer
 * `@fluixi/utils/object` and friends, which are finer-grained again.
 */
export * from '@fluixi/utils';
