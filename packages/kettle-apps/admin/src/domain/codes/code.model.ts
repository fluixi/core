export interface AuthCode {
  id:                     string;
  code:                   string;
  uid:                    string;
  client_id:              string;
  redirect_uri?:          string;
  scope?:                 string;
  scopes?:                string[];
  expires?:               string;
  used?:                  boolean;
  code_challenge?:        string;
  code_challenge_method?: string;
  nonce?:                 string;
  auth_time?:             string;
}
