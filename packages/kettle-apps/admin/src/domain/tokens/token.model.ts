export interface OAuthToken {
  id:            string;
  client_id:     string;
  uid:           string;
  token_type?:   string;
  access_token?: string;
  refresh_token?: string;
  scope?:        string;
  scopes?:       string[];
  expired_at?:   string;
  expires_in?:   number;
  revoked?:      boolean;
}
