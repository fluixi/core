export const SESSION_TOKEN_KEY              = 'adafri:token';
export const SESSION_EXPIRY_KEY             = 'adafri:token_expiry';
export const SESSION_USER_KEY               = 'adafri:user';
export const SESSION_PROFILE_REFRESHED_AT_KEY = 'adafri:profile_refreshed_at';
export const SELECTED_ACCOUNT_KEY           = 'adafri:selected_account';

export const DEFAULT_PAGE_SIZE = 20;

export const ROUTES = {
  login:                '/login',
  callback:             '/auth/callback',
  selectAccount:        '/select-account',
  dashboard:            '/dashboard',
  campaigns:            '/campaigns',
  settings:             '/settings',
  accountSettings:      '/accounts/:id/settings',
  workspace:            '/campaigns/:id/workspace',
  wsRoot:               '/workspace/:id',
  wsMessaging:          '/workspace/:id/messaging',
  wsDocs:               '/workspace/:id/docs',
  wsMembers:            '/workspace/:id/members',
  wsSettings:           '/workspace/:id/settings',
  wsScenarios:          '/workspace/:id/scenarios',
  wsCreatives:          '/workspace/:id/creatives',
  wsTeams:              '/workspace/:id/teams',
  wsCampaigns:          '/workspace/:id/campaigns',
} as const;

/** /campaigns/:id */
export function campaignUrl(id: string): string {
  return `/campaigns/${id}`;
}

/** /campaigns/:id/adgroups */
export function adGroupsUrl(campaignId: string): string {
  return `/campaigns/${campaignId}/adgroups`;
}

/** /campaigns/:id/adgroups/:gid */
export function adGroupUrl(campaignId: string, gid: string): string {
  return `/campaigns/${campaignId}/adgroups/${gid}`;
}

/** /campaigns/:id/adgroups/:gid/ads */
export function adsUrl(campaignId: string, gid: string): string {
  return `/campaigns/${campaignId}/adgroups/${gid}/ads`;
}

/** Build the workspace URL for a given campaign ID (legacy). */
export function workspaceUrl(campaignId: string): string {
  return `/campaigns/${campaignId}/workspace`;
}

/** Build a standalone workspace URL. */
export function wsUrl(wsId: string, sub = ''): string {
  return `/workspace/${wsId}${sub}`;
}

export function wsTeamsUrl(id: string): string {
  return `/workspace/${id}/teams`;
}

export function wsCampaignsUrl(id: string): string {
  return `/workspace/${id}/campaigns`;
}
