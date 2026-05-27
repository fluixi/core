export const SESSION_TOKEN_KEY              = 'adafri-admin:token';
export const SESSION_EXPIRY_KEY             = 'adafri-admin:token_expiry';
export const SESSION_USER_KEY               = 'adafri-admin:user';
export const SESSION_PROFILE_REFRESHED_AT_KEY = 'adafri-admin:profile_refreshed_at';

export const DEFAULT_PAGE_SIZE = 20;

export const ROUTES = {
  login:          '/login',
  callback:       '/auth/callback',
  dashboard:      '/dashboard',
  users:          '/users',
  userDetail:     '/users/:uid',
  oauthClients:   '/oauth-clients',
  oauthDetail:    '/oauth-clients/:id',
  accounts:       '/accounts',
  accountDetail:  '/accounts/:id',
} as const;
