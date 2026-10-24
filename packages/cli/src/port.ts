/**
 * The port `dev` and `start` listen on when the command line or the host chooses it: `--port`
 * first, then `PORT`, which most hosts set; `undefined` leaves it to `fluixi.config.ts`.
 */
export function portOverride(argv: readonly string[], env: Readonly<Record<string, string | undefined>>): number | undefined {
  const at = argv.findIndex((arg) => arg === '--port' || arg.startsWith('--port='));
  if (at >= 0) {
    const arg = argv[at]!;
    return parsePort(arg === '--port' ? argv[at + 1] : arg.slice('--port='.length), '--port');
  }
  return env.PORT ? parsePort(env.PORT, 'PORT') : undefined;
}

function parsePort(value: string | undefined, source: string): number {
  const port = Number(value);
  if (!value || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${source} must be a port number from 1 to 65535, not "${value ?? ''}"`);
  }
  return port;
}
