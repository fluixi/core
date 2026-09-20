/**
 * The logger, and the record of what it was asked to log.
 *
 * Keeping the lines on the instance is what lets the DI proof page and the tests show
 * something concrete: a per-request logger's `lines` are empty at the start of every
 * request, which is only true if the root injector really is per-request.
 */
export interface Logger {
  info(message: string): void;
  readonly lines: readonly string[];
}

export class ConsoleLogger implements Logger {
  readonly lines: string[] = [];
  constructor(private readonly prefix = 'desk') {}

  info(message: string): void {
    this.lines.push(message);
    // Quiet under test; a real deployment would ship these somewhere.
    if (process.env.NODE_ENV !== 'test') console.log(`[${this.prefix}] ${message}`);
  }
}
