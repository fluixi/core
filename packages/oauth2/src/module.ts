/**
 * The app-module half of this package, listed in `src/app.config.ts`.
 *
 * Registers the app's service under `AuthServiceToken` and its client under
 * `AuthClientToken` on both sides. Package code reaches the service through those tokens,
 * `OAuthCallback` among it, because a package cannot import the app. The server half, the
 * routes and session middleware of `tokens: 'server'`, is `authServerModule` in
 * `@fluixi/oauth2/server`, for `app.config.server.ts`.
 */
import { defineModule, type AppModule } from '@fluixi/start/app';
import { AuthServiceToken, AuthClientToken } from './tokens.js';
import type { AuthService } from './service.js';

export function authModule<U, P, Q>(auth: AuthService<U, P, Q>): AppModule {
  return defineModule({
    name: 'oauth2',
    providers: [
      // One instance for every request on the server. It holds no per-visitor state there:
      // the signed-in user comes from request locals, which `sessionLocals` fills per request.
      { provide: AuthServiceToken, useValue: auth as AuthService<unknown> },
      { provide: AuthClientToken, useValue: auth.client },
    ],
  });
}
