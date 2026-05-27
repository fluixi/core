export interface Account {
  id:          string;
  name:        string;
  owner_uid:   string;
  plan?:       string;
  is_active:   boolean;
  members?:    string[];
  createdAt?:  string;
  updatedAt?:  string;
}
