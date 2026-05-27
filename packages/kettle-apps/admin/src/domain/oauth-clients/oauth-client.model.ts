/** 'public' = SPA / mobile (PKCE, no secret). 'confidential' = server-side app (requires client_secret). */
export type ClientType = 'public' | 'confidential';

export interface OAuthClient {
  id:                           string;
  name:                         string;
  client_id:                    string;
  client_secret?:               string;
  client_type:                  ClientType;
  redirect_uris:                string[];
  grant_types:                  string[];
  scopes:                       string[];
  token_endpoint_auth_method:   string;
  token_endpoint_auth_methods:  string[];
  is_active:                    boolean;
  owner_uid?:                   string;
  createdAt?:                   string;
  updatedAt?:                   string;
}

export interface CreateOAuthClientDto {
  name:          string;
  redirect_uris: string[];
  client_type:   ClientType;
  grant_types?:  string[];
  scopes?:       string[];
  client_uri?:   string;
}
