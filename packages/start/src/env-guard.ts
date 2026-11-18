/**
 * Refuse to build when a secret is named so that it ships to the browser.
 *
 * Vite inlines every variable carrying the client prefix into `import.meta.env`, and it
 * does so whether any code reads it or not: putting `VITE_API_SECRET` in `.env` is enough
 * to publish it in the bundle. Nothing in an application can undo that, and nothing in it
 * looks wrong, which is why this is checked rather than documented.
 *
 * The prefix is what decides. An unprefixed name stays on the server, reachable through
 * `process.env`, which is where a secret belongs.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readsLikeSecret } from './env.js';

/** An escape hatch for a name that reads like a secret and is not. */
const ALLOW = 'FLUIXI_ALLOW_PUBLIC_SECRETS';

export interface ExposedSecret {
  name: string;
  file: string;
}

/** Client-prefixed names that look like secrets, across every env file an app may have. */
export function findExposedSecrets(root: string, prefix = 'VITE_'): ExposedSecret[] {
  const files = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.development.local',
    '.env.production',
    '.env.production.local',
  ];

  const found: ExposedSecret[] = [];
  for (const file of files) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;

    let text: string;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      continue;
    }

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const name = trimmed.split('=')[0]?.trim();
      if (!name?.startsWith(prefix)) continue;
      // Compared without the prefix, so `VITE_SECRET` is caught as readily as
      // `VITE_APP_SECRET`.
      if (readsLikeSecret(name.slice(prefix.length))) found.push({ name, file });
    }
  }
  return found;
}

/**
 * Throw when a secret would be published, naming each one and what to do.
 *
 * A build is the right place to stop: the value is already in the bundle by the time
 * anything runs, and a warning during a deploy is read after the fact.
 */
export function assertNoExposedSecrets(root: string, prefix = 'VITE_'): void {
  if (process.env[ALLOW] === 'true') return;

  const exposed = findExposedSecrets(root, prefix);
  if (!exposed.length) return;

  const list = exposed.map((e) => `    ${e.name}  (${e.file})`).join('\n');
  throw new Error(
    `[fluixi] These are named with the \`${prefix}\` prefix, so their values are inlined into the browser bundle and published to every visitor:\n\n${list}\n\n` +
      `  Drop the prefix. An unprefixed name is loaded into \`process.env\` for server code and stays out of the bundle:\n` +
      `    ${exposed[0].name.slice(prefix.length)}=...\n\n` +
      `  Read it with \`process.env\` rather than \`import.meta.env\`, from a server file: middleware, an API route, or a "use server" function.\n\n` +
      `  If one of these is genuinely public despite its name, set ${ALLOW}=true.\n`,
  );
}
