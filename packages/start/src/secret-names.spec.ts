/** Which names the build refuses to publish as public env. */
import { describe, it, expect } from 'vitest';
import { readsLikeSecret, suspectPublicNames } from './env.js';

describe('a name that reads like a secret', () => {
  it('is caught by the words anywhere in it, and by the ones that end it', () => {
    for (const name of ['API_SECRET', 'DB_PASSWORD', 'GITHUB_TOKEN', 'TOKEN', 'STRIPE_API_KEY', 'SENTRY_DSN', 'DATABASE_URL', 'APP_SECRETS']) {
      expect(readsLikeSecret(name), name).toBe(true);
    }
  });

  it('lets ordinary names through', () => {
    for (const name of ['TOKEN_ENDPOINT', 'API_URL', 'DATABASE_URL_HELP', 'PUBLIC_KEY', 'APP_NAME']) {
      expect(readsLikeSecret(name), name).toBe(false);
    }
  });

  it('is the same rule for the env.public check', () => {
    expect(suspectPublicNames(['API_URL', 'GITHUB_TOKEN'])).toEqual(['GITHUB_TOKEN']);
  });
});
