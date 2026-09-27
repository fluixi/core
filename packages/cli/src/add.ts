/**
 * `fluixi add <feature>`: set a feature up in an existing app. Where `fluixi g` writes files,
 * `add` also asks what it needs to know and installs the packages the files import.
 *
 *   fluixi add auth                                  asks
 *   fluixi add auth oauth2 --provider keycloak --tokens server --no-install
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stdin } from 'node:process';
import { c } from '@fluixi/start/ui';
import { reportAuth } from './report.js';
import {
  askSelect,
  projectFormat,
  PROVIDERS,
  SERVER_ONLY,
  ScaffoldError,
  setupBetterAuth,
  setupOAuth2,
  type ProviderName,
  type Tokens,
} from './scaffold/index.js';

export const ADD_USAGE = `Usage: fluixi add <feature> [options]

Features:
  auth [oauth2|better-auth]   authentication, asked for when not given
    --provider <p>            ${PROVIDERS.join(', ')}
    --tokens browser|server   where an OAuth2 app keeps its tokens
    --no-install              write the files, leave the packages to you
`;

function option(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i !== -1 && args[i + 1] && !args[i + 1].startsWith('-')) return args[i + 1];
  return args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

/** The install command for the package manager the lockfile names. */
export function installCommand(root: string, specs: string[]): [string, string[]] {
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return ['pnpm', ['add', ...specs]];
  if (existsSync(join(root, 'yarn.lock'))) return ['yarn', ['add', ...specs]];
  if (existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'))) return ['bun', ['add', ...specs]];
  return ['npm', ['install', ...specs]];
}

/**
 * The dist-tag the app's framework came from: an app on `alpha` gets the auth package from
 * `alpha` too, so the two agree on the framework they expect.
 */
export function channelOf(root: string): string {
  try {
    const version = JSON.parse(readFileSync(join(root, 'node_modules/@fluixi/start/package.json'), 'utf8')).version as string;
    return version.match(/-([a-z]+)\./)?.[1] ?? 'latest';
  } catch {
    return 'alpha';
  }
}

async function addAuth(root: string, args: string[]): Promise<void> {
  const ask = stdin.isTTY;
  // Only the word right after `auth`: a later bare word is an option's value.
  let kind = (args[1] && !args[1].startsWith('-') ? args[1] : undefined) as 'oauth2' | 'better-auth' | undefined;
  let provider = option(args, 'provider') as ProviderName | undefined;
  let tokens = option(args, 'tokens') as Tokens | undefined;
  if (kind && kind !== 'oauth2' && kind !== 'better-auth') throw new ScaffoldError(`unknown auth kind ${kind}: oauth2 or better-auth`);
  if (tokens && tokens !== 'browser' && tokens !== 'server') throw new ScaffoldError('--tokens is browser or server');
  if (provider && !PROVIDERS.includes(provider)) throw new ScaffoldError(`unknown provider ${provider}: ${PROVIDERS.join(', ')}`);

  if (!kind && ask) {
    kind = (await askSelect('Authentication', [
      { value: 'oauth2', label: 'OAuth2 / OIDC', hint: '@fluixi/oauth2 · Keycloak, Auth0, Okta, Google…' },
      { value: 'better-auth', label: 'Better Auth', hint: '@fluixi/auth · your own user table' },
    ])) as 'oauth2' | 'better-auth';
  }
  kind ??= 'oauth2';
  if (kind === 'oauth2' && !provider && ask) {
    provider = (await askSelect('Identity provider', PROVIDERS.map((p) => ({ value: p, label: p, hint: '' })))) as ProviderName;
  }
  if (kind === 'oauth2' && !tokens && ask && !SERVER_ONLY[provider ?? 'oidc']) {
    tokens = (await askSelect('Where the tokens live', [
      { value: 'browser', label: 'Browser', hint: 'public client · PKCE' },
      { value: 'server', label: 'Server', hint: 'httpOnly cookie · client secret' },
    ])) as Tokens;
  }

  const channel = channelOf(root);
  const result =
    kind === 'oauth2' ? setupOAuth2(root, { provider, tokens, format: projectFormat(root) }, channel) : setupBetterAuth(root, channel);
  const specs = Object.entries(result.dependencies).map(([name, spec]) => `${name}@${spec}`);

  if (args.includes('--no-install')) {
    reportAuth(result, `install ${specs.join(' ')}`);
    return;
  }
  reportAuth(result);
  const [bin, binArgs] = installCommand(root, specs);
  console.log(`  ${c.gray('›')} ${c.cyan([bin, ...binArgs].join(' '))}`);
  execFileSync(bin, binArgs, { cwd: root, stdio: 'inherit' });
}

export async function add(feature: string | undefined, args: string[], root = process.cwd()): Promise<void> {
  if (feature !== 'auth') {
    console.error(ADD_USAGE);
    process.exitCode = 1;
    return;
  }
  try {
    await addAuth(root, args);
  } catch (error) {
    if (!(error instanceof ScaffoldError)) throw error;
    console.error(`  ${c.red('✗')} ${error.message}`);
    process.exitCode = 1;
  }
}
