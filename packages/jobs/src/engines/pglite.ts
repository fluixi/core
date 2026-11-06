/**
 * Embedded mode: pg-boss on a PGlite instance in this process. A query with values goes through
 * `query`; a script without values may hold several statements, which `exec` runs, and answers one
 * result per statement as the `pg` driver does. Notifications use PGlite's in-process listen.
 */

/** The parts of a PGlite instance used here; `@electric-sql/pglite` is an optional peer. */
export interface PGliteLike {
  query<Row>(text: string, values?: unknown[]): Promise<{ rows: Row[] }>;
  exec(text: string): Promise<{ rows: unknown[] }[]>;
  listen(channel: string, callback: (payload: string) => void): Promise<() => Promise<void>>;
}

export function pgliteDatabase(lite: PGliteLike) {
  return {
    async executeSql(text: string, values?: unknown[]) {
      if (values?.length) return { rows: (await lite.query(text, values)).rows };
      const results = await lite.exec(text);
      return results.length > 1 ? (results.map((result) => ({ rows: result.rows })) as never) : { rows: results[0]?.rows ?? [] };
    },
    async listen(channel: string, onNotification: (payload: string) => void, onReconnect: () => void) {
      const stop = await lite.listen(channel, onNotification);
      onReconnect();
      return { close: () => stop() };
    },
  };
}
